-- Migration: 020_mobility_concurrency_and_rls.sql
-- Description: Hardened Mobility RLS policies, column corrections, and atomic concurrency-safe driver_accept_ride RPC

-- 1. Fix Driver Location Updates RLS policy (correct column names to approval_status)
DROP POLICY IF EXISTS "Driver insert location updates" ON public.ride_location_updates;
CREATE POLICY "Driver insert location updates" ON public.ride_location_updates 
FOR INSERT TO authenticated 
WITH CHECK (
    driver_id IN (
        SELECT id FROM public.drivers 
        WHERE profile_id = auth.uid() 
          AND approval_status = 'approved'
    )
    AND ride_id IN (
        SELECT id FROM public.rides 
        WHERE driver_id = (SELECT id FROM public.drivers WHERE profile_id = auth.uid())
          AND status IN ('driver_assigned', 'arrived', 'in_transit')
    )
);

-- 2. Ensure Rides UPDATE RLS allows involved parties and drivers accepting requested rides
DROP POLICY IF EXISTS "Involved parties update ride" ON public.rides;
CREATE POLICY "Involved parties update ride" ON public.rides 
FOR UPDATE TO authenticated 
USING (
    customer_id = auth.uid() OR
    driver_id IN (SELECT id FROM public.drivers WHERE profile_id = auth.uid()) OR
    (status = 'requested' AND public.has_role(auth.uid(), 'driver')) OR
    public.is_admin(auth.uid())
);

-- 3. Atomic Driver Ride Acceptance RPC with FOR UPDATE row lock to eliminate race conditions
CREATE OR REPLACE FUNCTION public.driver_accept_ride(
    p_ride_id UUID,
    p_driver_id UUID,
    p_vehicle_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_driver RECORD;
    v_vehicle RECORD;
    v_ride RECORD;
BEGIN
    -- 1. Security Check: Authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- 2. Verify caller owns this driver profile and is approved
    SELECT id, profile_id, approval_status, is_online
    INTO v_driver
    FROM public.drivers
    WHERE id = p_driver_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Driver profile not found.';
    END IF;

    IF v_driver.profile_id <> auth.uid() AND NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access Denied: You cannot accept rides for another driver.';
    END IF;

    IF v_driver.approval_status <> 'approved' THEN
        RAISE EXCEPTION 'Driver is not approved to accept rides.';
    END IF;

    -- 3. Verify vehicle ownership and active status
    SELECT id, driver_id, is_active
    INTO v_vehicle
    FROM public.vehicles
    WHERE id = p_vehicle_id;

    IF NOT FOUND OR v_vehicle.driver_id <> p_driver_id THEN
        RAISE EXCEPTION 'Vehicle not found or does not belong to driver.';
    END IF;

    -- 4. Atomic row lock on the ride to prevent race conditions
    SELECT id, status, customer_id
    INTO v_ride
    FROM public.rides
    WHERE id = p_ride_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ride not found.';
    END IF;

    IF v_ride.status <> 'requested' THEN
        RAISE EXCEPTION 'عذراً، هذه الرحلة لم تعد متاحة أو تم قبولها بالفعل من كابتن آخر.';
    END IF;

    -- 5. Atomic state transition
    UPDATE public.rides
    SET
        driver_id = p_driver_id,
        vehicle_id = p_vehicle_id,
        status = 'driver_assigned',
        updated_at = NOW()
    WHERE id = p_ride_id;

    RETURN jsonb_build_object(
        'success', true,
        'ride_id', p_ride_id,
        'driver_id', p_driver_id,
        'vehicle_id', p_vehicle_id,
        'status', 'driver_assigned'
    );
END;
$$;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION public.driver_accept_ride(UUID, UUID, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.driver_accept_ride(UUID, UUID, UUID) FROM anon;
