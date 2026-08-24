-- Migration: 025_dispatch_engine.sql
-- Description: Kafrawy Go Dispatch & Matching Engine with Dispatch Attempts, Eligibility & Ranking, Expiry, and Realtime

-- 1. Create dispatch_attempts table
CREATE TABLE IF NOT EXISTS public.dispatch_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'offered', -- 'offered', 'accepted', 'rejected', 'expired', 'cancelled', 'failed'
    offered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '25 seconds'),
    responded_at TIMESTAMPTZ NULL,
    response VARCHAR(50) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_ride_driver_attempt UNIQUE (ride_id, driver_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_dispatch_attempts_ride_status ON public.dispatch_attempts(ride_id, status);
CREATE INDEX IF NOT EXISTS idx_dispatch_attempts_driver_status ON public.dispatch_attempts(driver_id, status);

-- Enable RLS on dispatch_attempts
ALTER TABLE public.dispatch_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dispatch_attempts
DROP POLICY IF EXISTS "Drivers view own dispatch attempts" ON public.dispatch_attempts;
CREATE POLICY "Drivers view own dispatch attempts" ON public.dispatch_attempts
FOR SELECT TO authenticated
USING (
    driver_id IN (SELECT id FROM public.drivers WHERE profile_id = auth.uid()) OR
    ride_id IN (SELECT id FROM public.rides WHERE customer_id = auth.uid()) OR
    public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Drivers update own dispatch attempts" ON public.dispatch_attempts;
CREATE POLICY "Drivers update own dispatch attempts" ON public.dispatch_attempts
FOR UPDATE TO authenticated
USING (
    driver_id IN (SELECT id FROM public.drivers WHERE profile_id = auth.uid()) OR
    public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "System insert dispatch attempts" ON public.dispatch_attempts;
CREATE POLICY "System insert dispatch attempts" ON public.dispatch_attempts
FOR INSERT TO authenticated
WITH CHECK (true);

-- Enable Realtime for dispatch_attempts
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_attempts;

-- 2. Function to find eligible drivers ordered by distance (using PostGIS geography or Haversine fallback)
CREATE OR REPLACE FUNCTION public.find_eligible_drivers(p_ride_id UUID)
RETURNS TABLE (
    driver_id UUID,
    profile_id UUID,
    distance_meters FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pickup_lat NUMERIC;
    v_pickup_lng NUMERIC;
    v_pickup_geom geography;
BEGIN
    -- Get ride pickup coords
    SELECT pickup_latitude, pickup_longitude, pickup_location
    INTO v_pickup_lat, v_pickup_lng, v_pickup_geom
    FROM public.rides
    WHERE id = p_ride_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF v_pickup_geom IS NULL AND v_pickup_lat IS NOT NULL AND v_pickup_lng IS NOT NULL THEN
        v_pickup_geom := ST_SetSRID(ST_MakePoint(v_pickup_lng, v_pickup_lat), 4326)::geography;
    END IF;

    RETURN QUERY
    SELECT 
        d.id AS driver_id,
        d.profile_id,
        CASE 
            WHEN v_pickup_geom IS NOT NULL AND d.id IN (SELECT rlu.driver_id FROM public.ride_location_updates rlu WHERE rlu.driver_id = d.id) THEN
                ST_Distance(
                    v_pickup_geom,
                    (SELECT rlu.location FROM public.ride_location_updates rlu WHERE rlu.driver_id = d.id ORDER BY rlu.created_at DESC LIMIT 1)::geography
                )
            ELSE 0.0
        END AS distance_meters
    FROM public.drivers d
    WHERE d.approval_status = 'approved'
      AND d.is_online = true
      -- GPS freshness: last_seen within last 120 seconds
      AND d.last_seen >= (NOW() - INTERVAL '120 seconds')
      -- Not currently in an active ride (driver_assigned, arrived, in_transit)
      AND NOT EXISTS (
          SELECT 1 FROM public.rides r 
          WHERE r.driver_id = d.id 
            AND r.status IN ('driver_assigned', 'arrived', 'in_transit')
      )
      -- Has not already been offered or rejected/expired this ride in an active/recent attempt
      AND NOT EXISTS (
          SELECT 1 FROM public.dispatch_attempts da
          WHERE da.ride_id = p_ride_id 
            AND da.driver_id = d.id
            AND da.status IN ('offered', 'accepted')
      )
    ORDER BY distance_meters ASC;
END;
$$;

-- 3. Function to dispatch ride to next eligible driver
CREATE OR REPLACE FUNCTION public.dispatch_next_driver(p_ride_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ride_status public.ride_status_enum;
    v_candidate RECORD;
    v_driver_profile_id UUID;
    v_ride RECORD;
BEGIN
    -- Check ride status is requested
    SELECT status, pickup_address_text, dropoff_address_text, estimated_fare, customer_id
    INTO v_ride
    FROM public.rides
    WHERE id = p_ride_id;

    IF NOT FOUND OR v_ride.status <> 'requested' THEN
        RETURN false;
    END IF;

    -- Expire any currently 'offered' attempts for this ride that have passed their expires_at
    UPDATE public.dispatch_attempts
    SET status = 'expired', updated_at = NOW()
    WHERE ride_id = p_ride_id
      AND status = 'offered'
      AND expires_at <= NOW();

    -- Find top eligible driver
    SELECT * INTO v_candidate
    FROM public.find_eligible_drivers(p_ride_id)
    LIMIT 1;

    IF NOT FOUND THEN
        -- No eligible driver currently available
        RETURN false;
    END IF;

    -- Get driver profile_id
    SELECT profile_id INTO v_driver_profile_id
    FROM public.drivers
    WHERE id = v_candidate.driver_id;

    -- Create dispatch attempt
    INSERT INTO public.dispatch_attempts (
        ride_id,
        driver_id,
        status,
        offered_at,
        expires_at
    )
    VALUES (
        p_ride_id,
        v_candidate.driver_id,
        'offered',
        NOW(),
        NOW() + INTERVAL '25 seconds'
    )
    ON CONFLICT (ride_id, driver_id) DO UPDATE
    SET status = 'offered', offered_at = NOW(), expires_at = NOW() + INTERVAL '25 seconds', updated_at = NOW();

    -- Create Notification for Driver
    IF v_driver_profile_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            recipient_id,
            profile_id,
            type,
            title,
            message,
            ride_id,
            driver_id,
            severity,
            dedup_key
        )
        VALUES (
            v_driver_profile_id,
            v_driver_profile_id,
            'new_ride',
            'رحلة جديدة متاحة للتوصيل',
            'طلب رحلة من ' || LEFT(v_ride.pickup_address_text, 25) || ' إلى ' || LEFT(v_ride.dropoff_address_text, 25) || ' (القيمة التقديرية: ' || COALESCE(v_ride.estimated_fare, 0) || ' ج.م)',
            p_ride_id,
            v_candidate.driver_id,
            'warning',
            'dispatch-offer-' || p_ride_id || '-' || v_candidate.driver_id || '-' || extract(epoch from now())::bigint
        )
        ON CONFLICT (dedup_key) DO NOTHING;
    END IF;

    RETURN true;
END;
$$;

-- 4. Function for driver response to dispatch attempt (accept or reject)
CREATE OR REPLACE FUNCTION public.driver_respond_to_dispatch(
    p_dispatch_id UUID,
    p_response TEXT -- 'accepted' or 'rejected'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_attempt RECORD;
    v_ride RECORD;
    v_driver RECORD;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF p_response NOT IN ('accepted', 'rejected') THEN
        RAISE EXCEPTION 'Invalid response. Must be accepted or rejected.';
    END IF;

    -- Get dispatch attempt with row lock
    SELECT da.id, da.ride_id, da.driver_id, da.status, da.expires_at
    INTO v_attempt
    FROM public.dispatch_attempts da
    WHERE da.id = p_dispatch_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Dispatch offer not found.';
    END IF;

    -- Verify driver owns this attempt
    SELECT id, profile_id, approval_status, is_online
    INTO v_driver
    FROM public.drivers
    WHERE id = v_attempt.driver_id;

    IF NOT FOUND OR (v_driver.profile_id <> auth.uid() AND NOT public.is_admin(auth.uid())) THEN
        RAISE EXCEPTION 'Access Denied: This dispatch offer belongs to another driver.';
    END IF;

    IF v_attempt.status <> 'offered' THEN
        RAISE EXCEPTION 'عذراً، هذا العرض منتهي الصلاحية أو تم الرد عليه مسبقاً.';
    END IF;

    IF v_attempt.expires_at <= NOW() THEN
        UPDATE public.dispatch_attempts SET status = 'expired', updated_at = NOW() WHERE id = p_dispatch_id;
        RAISE EXCEPTION 'انتهت مهلة قبول الرحلة.';
    END IF;

    -- Get ride
    SELECT id, status, customer_id
    INTO v_ride
    FROM public.rides
    WHERE id = v_attempt.ride_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ride not found.';
    END IF;

    IF v_ride.status <> 'requested' THEN
        -- Mark attempt as failed/expired since ride is no longer requested
        UPDATE public.dispatch_attempts SET status = 'expired', responded_at = NOW(), response = 'ride_unavailable', updated_at = NOW() WHERE id = p_dispatch_id;
        RAISE EXCEPTION 'هذه الرحلة لم تعد متاحة.';
    END IF;

    IF p_response = 'accepted' THEN
        -- Check if driver is approved and online
        IF v_driver.approval_status <> 'approved' OR v_driver.is_online <> true THEN
            RAISE EXCEPTION 'الكابتن غير مفعل أو غير متصل.';
        END IF;

        -- Update dispatch attempt to accepted
        UPDATE public.dispatch_attempts
        SET status = 'accepted', responded_at = NOW(), response = 'accepted', updated_at = NOW()
        WHERE id = p_dispatch_id;

        -- Expire any other offered attempts for this ride
        UPDATE public.dispatch_attempts
        SET status = 'expired', updated_at = NOW()
        WHERE ride_id = v_attempt.ride_id
          AND id <> p_dispatch_id
          AND status = 'offered';

        -- Assign ride to driver using existing ride assignment logic or direct update
        -- Find driver active vehicle
        DECLARE
            v_vehicle_id UUID;
        SELECT id INTO v_vehicle_id FROM public.vehicles WHERE driver_id = v_attempt.driver_id AND is_active = true LIMIT 1;

        UPDATE public.rides
        SET driver_id = v_attempt.driver_id,
            vehicle_id = v_vehicle_id,
            status = 'driver_assigned',
            updated_at = NOW()
        WHERE id = v_attempt.ride_id;

        RETURN json_build_object('success', true, 'message', 'تم قبول الرحلة بنجاح', 'ride_id', v_attempt.ride_id)::jsonb;

    ELSE
        -- Rejected
        UPDATE public.dispatch_attempts
        SET status = 'rejected', responded_at = NOW(), response = 'rejected', updated_at = NOW()
        WHERE id = p_dispatch_id;

        -- Trigger dispatch to next driver asynchronously / synchronously
        PERFORM public.dispatch_next_driver(v_attempt.ride_id);

        RETURN json_build_object('success', true, 'message', 'تم رفض الرحلة', 'ride_id', v_attempt.ride_id)::jsonb;
    END IF;
END;
$$;

-- 5. Trigger on new ride insert to automatically trigger first dispatch attempt
CREATE OR REPLACE FUNCTION public.trigger_initial_ride_dispatch()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'requested') THEN
        -- Attempt to dispatch to nearest eligible driver
        PERFORM public.dispatch_next_driver(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_initial_ride_dispatch ON public.rides;
CREATE TRIGGER trg_initial_ride_dispatch
AFTER INSERT ON public.rides
FOR EACH ROW EXECUTE FUNCTION public.trigger_initial_ride_dispatch();
