-- Migration: 023_cash_only_hardening.sql
-- Description: Strict Cash-Only MVP Model, Secure Cash Collection RPC, and Cash Operations Analytics

-- 1. Ensure rides table constraint allows only 'cash' for current MVP phase
ALTER TABLE public.rides 
DROP CONSTRAINT IF EXISTS chk_rides_payment_method;

ALTER TABLE public.rides 
ADD CONSTRAINT chk_rides_payment_method CHECK (payment_method = 'cash');

-- 2. Update payment_status check constraint
ALTER TABLE public.rides 
DROP CONSTRAINT IF EXISTS chk_rides_payment_status;

ALTER TABLE public.rides 
ADD CONSTRAINT chk_rides_payment_status CHECK (
    payment_status IN ('pending', 'pending_cash_collection', 'paid_cash', 'cancelled')
);

-- Add paid_by and paid_at columns if not present
ALTER TABLE public.rides 
ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- 3. Hardened FinTech Splits and Cash State Lifecycle Trigger
CREATE OR REPLACE FUNCTION public.calculate_ride_fintech_splits()
RETURNS TRIGGER AS $$
DECLARE
    v_total NUMERIC(10, 2);
    v_rate NUMERIC(5, 4) := 0.1500; -- 15% Platform Commission
    v_commission NUMERIC(10, 2);
    v_driver NUMERIC(10, 2);
BEGIN
    -- Strict MVP Rule: All rides are Cash Only
    NEW.payment_method := 'cash';

    -- Commission Rate defaults to 15%
    IF NEW.commission_rate IS NULL OR NEW.commission_rate <= 0 THEN
        NEW.commission_rate := v_rate;
    ELSE
        v_rate := NEW.commission_rate;
    END IF;

    -- When ride is newly requested or estimated
    IF TG_OP = 'INSERT' OR (OLD.status = 'requested' AND NEW.status = 'requested') THEN
        IF NEW.payment_status IS NULL THEN
            NEW.payment_status := 'pending';
        END IF;
        IF NEW.estimated_fare IS NOT NULL AND NEW.estimated_fare > 0 THEN
            v_total := ROUND(NEW.estimated_fare, 2);
            v_commission := ROUND(v_total * v_rate, 2);
            v_driver := v_total - v_commission;

            NEW.customer_total := v_total;
            NEW.platform_commission := v_commission;
            NEW.driver_earning := v_driver;
        END IF;
    END IF;

    -- When ride is updated to completed
    IF NEW.status = 'completed' THEN
        -- Determine total fare from final_fare or fallback to estimated_fare
        IF NEW.final_fare IS NOT NULL AND NEW.final_fare > 0 THEN
            v_total := ROUND(NEW.final_fare, 2);
        ELSIF NEW.estimated_fare IS NOT NULL AND NEW.estimated_fare > 0 THEN
            v_total := ROUND(NEW.estimated_fare, 2);
            NEW.final_fare := v_total;
        ELSE
            v_total := 20.00; -- Minimum Fare Floor
            NEW.final_fare := v_total;
        END IF;

        -- Exact FinTech Split: customer_total = driver_earning + platform_commission
        v_commission := ROUND(v_total * v_rate, 2);
        v_driver := v_total - v_commission;

        NEW.customer_total := v_total;
        NEW.platform_commission := v_commission;
        NEW.driver_earning := v_driver;

        -- Transition payment status to pending_cash_collection if not already paid
        IF OLD.status <> 'completed' AND (NEW.payment_status IS NULL OR NEW.payment_status = 'pending') THEN
            NEW.payment_status := 'pending_cash_collection';
        END IF;
    END IF;

    -- When ride is cancelled
    IF NEW.status = 'cancelled' THEN
        NEW.payment_status := 'cancelled';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_calculate_ride_fintech ON public.rides;
CREATE TRIGGER trg_calculate_ride_fintech
BEFORE INSERT OR UPDATE OF final_fare, estimated_fare, status ON public.rides
FOR EACH ROW
EXECUTE FUNCTION public.calculate_ride_fintech_splits();

-- 4. Secure RPC to mark cash payment as collected
CREATE OR REPLACE FUNCTION public.mark_cash_payment_received(p_ride_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ride RECORD;
    v_caller_is_driver BOOLEAN := false;
    v_caller_is_admin BOOLEAN := false;
BEGIN
    -- 1. Authenticated check
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- 2. Lock the ride row atomically
    SELECT id, status, customer_id, driver_id, customer_total, final_fare, estimated_fare, 
           payment_method, payment_status, platform_commission, driver_earning
    INTO v_ride
    FROM public.rides
    WHERE id = p_ride_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ride not found.';
    END IF;

    -- 3. Ride must be completed
    IF v_ride.status <> 'completed' THEN
        RAISE EXCEPTION 'لا يمكن تسجيل تحصيل الكاش لرحلة غير مكتملة.';
    END IF;

    -- 4. Payment method must be cash
    IF v_ride.payment_method <> 'cash' THEN
        RAISE EXCEPTION 'طريقة الدفع لهذه الرحلة ليست نقدية.';
    END IF;

    -- 5. Prevent double collection
    IF v_ride.payment_status = 'paid_cash' THEN
        RAISE EXCEPTION 'تم تسجيل تحصيل هذا المبلغ نقداً بالفعل.';
    END IF;

    -- 6. Verify caller authorization: must be the assigned driver or admin
    IF v_ride.driver_id IN (SELECT id FROM public.drivers WHERE profile_id = auth.uid()) THEN
        v_caller_is_driver := true;
    END IF;

    IF public.is_admin(auth.uid()) THEN
        v_caller_is_admin := true;
    END IF;

    IF NOT (v_caller_is_driver OR v_caller_is_admin) THEN
        RAISE EXCEPTION 'Access Denied: Only the assigned captain or an admin can confirm cash collection.';
    END IF;

    -- 7. Update payment status to paid_cash
    UPDATE public.rides
    SET
        payment_status = 'paid_cash',
        paid_at = NOW(),
        paid_by = auth.uid(),
        updated_at = NOW()
    WHERE id = p_ride_id;

    -- 8. Record in audit logs
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        target_entity,
        target_id,
        old_value,
        new_value
    ) VALUES (
        auth.uid(),
        'CASH_PAYMENT_COLLECTED',
        'rides',
        p_ride_id::text,
        jsonb_build_object('payment_status', v_ride.payment_status),
        jsonb_build_object(
            'payment_status', 'paid_cash',
            'amount_collected', COALESCE(v_ride.customer_total, v_ride.final_fare, v_ride.estimated_fare),
            'platform_commission', v_ride.platform_commission,
            'driver_earning', v_ride.driver_earning,
            'paid_by', auth.uid(),
            'paid_at', NOW()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'ride_id', p_ride_id,
        'payment_status', 'paid_cash',
        'customer_total', COALESCE(v_ride.customer_total, v_ride.final_fare, v_ride.estimated_fare),
        'driver_earning', v_ride.driver_earning,
        'platform_commission', v_ride.platform_commission,
        'paid_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_cash_payment_received(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_cash_payment_received(UUID) FROM anon;

-- 5. Admin Cash Operations & Driver Cash Balance Analytics RPC
CREATE OR REPLACE FUNCTION public.get_cash_operations_analytics(p_period TEXT DEFAULT 'all')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_total_rides INT := 0;
    v_completed_rides INT := 0;
    v_total_amount NUMERIC(12, 2) := 0.00;
    v_collected_amount NUMERIC(12, 2) := 0.00;
    v_pending_collection NUMERIC(12, 2) := 0.00;
    v_total_commission NUMERIC(12, 2) := 0.00;
    v_total_driver_earnings NUMERIC(12, 2) := 0.00;
    v_driver_balances JSONB := '[]'::jsonb;
BEGIN
    -- Verify Admin
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can access cash analytics.';
    END IF;

    -- Period filter calculation
    IF p_period = 'today' THEN
        v_start_time := DATE_TRUNC('day', NOW());
    ELSIF p_period = 'yesterday' THEN
        v_start_time := DATE_TRUNC('day', NOW() - INTERVAL '1 day');
    ELSIF p_period = 'this_week' THEN
        v_start_time := DATE_TRUNC('week', NOW());
    ELSIF p_period = 'this_month' THEN
        v_start_time := DATE_TRUNC('month', NOW());
    ELSE
        v_start_time := '2020-01-01 00:00:00Z'::timestamptz;
    END IF;

    -- Aggregate overall metrics
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COALESCE(SUM(customer_total) FILTER (WHERE status = 'completed'), 0.00),
        COALESCE(SUM(customer_total) FILTER (WHERE status = 'completed' AND payment_status = 'paid_cash'), 0.00),
        COALESCE(SUM(customer_total) FILTER (WHERE status = 'completed' AND payment_status = 'pending_cash_collection'), 0.00),
        COALESCE(SUM(platform_commission) FILTER (WHERE status = 'completed'), 0.00),
        COALESCE(SUM(driver_earning) FILTER (WHERE status = 'completed'), 0.00)
    INTO
        v_total_rides,
        v_completed_rides,
        v_total_amount,
        v_collected_amount,
        v_pending_collection,
        v_total_commission,
        v_total_driver_earnings
    FROM public.rides
    WHERE created_at >= v_start_time;

    -- Aggregate per-driver cash balances
    SELECT jsonb_agg(
        jsonb_build_object(
            'driver_id', d.id,
            'driver_name', p.full_name,
            'driver_phone', p.phone_number,
            'completed_rides', COUNT(r.id),
            'cash_collected', COALESCE(SUM(r.customer_total) FILTER (WHERE r.payment_status = 'paid_cash'), 0.00),
            'driver_net_earnings', COALESCE(SUM(r.driver_earning) FILTER (WHERE r.payment_status = 'paid_cash'), 0.00),
            'platform_commission_due', COALESCE(SUM(r.platform_commission) FILTER (WHERE r.payment_status = 'paid_cash'), 0.00),
            'pending_collection', COALESCE(SUM(r.customer_total) FILTER (WHERE r.payment_status = 'pending_cash_collection'), 0.00)
        )
    )
    INTO v_driver_balances
    FROM public.drivers d
    JOIN public.profiles p ON d.profile_id = p.id
    LEFT JOIN public.rides r ON r.driver_id = d.id AND r.status = 'completed' AND r.created_at >= v_start_time
    GROUP BY d.id, p.full_name, p.phone_number;

    RETURN jsonb_build_object(
        'period', p_period,
        'total_rides', v_total_rides,
        'completed_rides', v_completed_rides,
        'total_amount', v_total_amount,
        'collected_amount', v_collected_amount,
        'pending_collection', v_pending_collection,
        'total_commission', v_total_commission,
        'total_driver_earnings', v_total_driver_earnings,
        'driver_balances', COALESCE(v_driver_balances, '[]'::jsonb)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cash_operations_analytics(TEXT) TO authenticated;
