-- Migration: 021_fintech_and_lifecycle_hardening.sql
-- Description: FinTech Commission Engine, Secure Server-Side Ride Completion, Cancellation Guard with Audit Trail, and Payment Stubs

-- 1. Alter Rides Table to add FinTech fields and Cancellation metadata
ALTER TABLE public.rides 
ADD COLUMN IF NOT EXISTS customer_total NUMERIC(10, 2) CHECK (customer_total >= 0),
ADD COLUMN IF NOT EXISTS driver_earning NUMERIC(10, 2) CHECK (driver_earning >= 0),
ADD COLUMN IF NOT EXISTS platform_commission NUMERIC(10, 2) CHECK (platform_commission >= 0),
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5, 4) DEFAULT 0.1500 CHECK (commission_rate >= 0 AND commission_rate <= 1.0),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'wallet', 'card', 'online')),
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 2. Alter Drivers Table to add last_seen for Heartbeat and online detection
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- 3. FinTech Commission Calculation Trigger on Ride Completion or Fare Setting
CREATE OR REPLACE FUNCTION public.calculate_ride_fintech_splits()
RETURNS TRIGGER AS $$
DECLARE
    v_total NUMERIC(10, 2);
    v_rate NUMERIC(5, 4) := 0.1500; -- 15% Platform Commission
    v_commission NUMERIC(10, 2);
    v_driver NUMERIC(10, 2);
BEGIN
    -- Only compute if final_fare is set or updated
    IF NEW.final_fare IS NOT NULL AND NEW.final_fare > 0 THEN
        v_total := ROUND(NEW.final_fare, 2);
        IF NEW.commission_rate IS NOT NULL AND NEW.commission_rate > 0 THEN
            v_rate := NEW.commission_rate;
        END IF;
        
        -- Exact FinTech Split: customer_total = driver_earning + platform_commission
        v_commission := ROUND(v_total * v_rate, 2);
        v_driver := v_total - v_commission;

        NEW.customer_total := v_total;
        NEW.platform_commission := v_commission;
        NEW.driver_earning := v_driver;

        -- If ride is completed, sync payment_status for Cash
        IF NEW.status = 'completed' AND (NEW.payment_status IS NULL OR NEW.payment_status = 'pending') THEN
            IF NEW.payment_method = 'cash' THEN
                NEW.payment_status := 'completed';
            END IF;
        END IF;
    ELSIF NEW.estimated_fare IS NOT NULL AND NEW.final_fare IS NULL THEN
        -- Provide projected split on estimation
        v_total := ROUND(NEW.estimated_fare, 2);
        v_commission := ROUND(v_total * v_rate, 2);
        v_driver := v_total - v_commission;
        
        NEW.customer_total := v_total;
        NEW.platform_commission := v_commission;
        NEW.driver_earning := v_driver;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_calculate_ride_fintech ON public.rides;
CREATE TRIGGER trg_calculate_ride_fintech
BEFORE INSERT OR UPDATE OF final_fare, estimated_fare, status ON public.rides
FOR EACH ROW
EXECUTE FUNCTION public.calculate_ride_fintech_splits();

-- 4. Server-Side Cancellation RPC with Role Verification & Reason Logging
CREATE OR REPLACE FUNCTION public.cancel_ride(
    p_ride_id UUID,
    p_reason TEXT DEFAULT 'Cancelled by user'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ride RECORD;
    v_is_driver BOOLEAN := false;
    v_is_customer BOOLEAN := false;
    v_is_admin BOOLEAN := false;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Lock ride row
    SELECT id, status, customer_id, driver_id
    INTO v_ride
    FROM public.rides
    WHERE id = p_ride_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ride not found.';
    END IF;

    IF v_ride.status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'لا يمكن إلغاء رحلة مكتملة أو ملغاة بالفعل.';
    END IF;

    -- Check caller authority
    IF v_ride.customer_id = auth.uid() THEN
        v_is_customer := true;
    END IF;

    IF v_ride.driver_id IN (SELECT id FROM public.drivers WHERE profile_id = auth.uid()) THEN
        v_is_driver := true;
    END IF;

    IF public.is_admin(auth.uid()) THEN
        v_is_admin := true;
    END IF;

    IF NOT (v_is_customer OR v_is_driver OR v_is_admin) THEN
        RAISE EXCEPTION 'Access Denied: You are not authorized to cancel this ride.';
    END IF;

    -- Update ride atomically
    UPDATE public.rides
    SET
        status = 'cancelled',
        cancelled_by = auth.uid(),
        cancellation_reason = p_reason,
        cancelled_at = NOW(),
        payment_status = 'cancelled',
        updated_at = NOW()
    WHERE id = p_ride_id;

    -- Insert into audit log
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        target_entity,
        target_id,
        old_value,
        new_value
    ) VALUES (
        auth.uid(),
        'RIDE_CANCELLED',
        'rides',
        p_ride_id::text,
        jsonb_build_object('status', v_ride.status),
        jsonb_build_object('status', 'cancelled', 'reason', p_reason, 'cancelled_by', auth.uid())
    );

    RETURN jsonb_build_object(
        'success', true,
        'ride_id', p_ride_id,
        'status', 'cancelled',
        'cancelled_by', auth.uid()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_ride(UUID, TEXT) TO authenticated;

-- 5. Heartbeat RPC for Driver Online Status
CREATE OR REPLACE FUNCTION public.driver_heartbeat(
    p_driver_id UUID,
    p_latitude NUMERIC DEFAULT NULL,
    p_longitude NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_driver RECORD;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT id, profile_id, approval_status, is_online
    INTO v_driver
    FROM public.drivers
    WHERE id = p_driver_id;

    IF NOT FOUND OR (v_driver.profile_id <> auth.uid() AND NOT public.is_admin(auth.uid())) THEN
        RAISE EXCEPTION 'Access Denied: Driver not found or not owned by user.';
    END IF;

    IF v_driver.approval_status <> 'approved' THEN
        RAISE EXCEPTION 'Cannot update heartbeat for unapproved driver.';
    END IF;

    UPDATE public.drivers
    SET 
        last_seen = NOW(),
        updated_at = NOW()
    WHERE id = p_driver_id;

    RETURN jsonb_build_object('success', true, 'timestamp', NOW());
END;
$$;

GRANT EXECUTE ON FUNCTION public.driver_heartbeat(UUID, NUMERIC, NUMERIC) TO authenticated;
