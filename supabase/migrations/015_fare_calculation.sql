-- Migration: 015_fare_calculation.sql
-- Description: Server-side fare calculation and concurrency protection

-- 1. Server-side Fare Calculation Trigger
CREATE OR REPLACE FUNCTION public.calculate_ride_fare()
RETURNS TRIGGER AS $$
DECLARE
    dist_km NUMERIC;
    base_fare NUMERIC := 12.0;
    price_per_km NUMERIC := 6.5;
    price_per_min NUMERIC := 0.8;
    booking_fee NUMERIC := 5.0;
    min_fare NUMERIC := 20.0;
    surge_multiplier NUMERIC := 1.0; -- Basic surge, can be enhanced
    duration_min NUMERIC;
    calculated_fare NUMERIC;
    R NUMERIC := 6371; -- Earth radius
    dLat NUMERIC;
    dLng NUMERIC;
    a NUMERIC;
    c NUMERIC;
BEGIN
    -- Fallback Haversine if no actual routing distance is provided
    -- But since we can't do OSRM call from within Postgres without extension, 
    -- we will use a geometric approximation (distance * 1.3 for city blocks)
    dLat := (NEW.dropoff_latitude - NEW.pickup_latitude) * pi() / 180;
    dLng := (NEW.dropoff_longitude - NEW.pickup_longitude) * pi() / 180;
    a := sin(dLat/2) * sin(dLat/2) + cos(NEW.pickup_latitude * pi() / 180) * cos(NEW.dropoff_latitude * pi() / 180) * sin(dLng/2) * sin(dLng/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    dist_km := R * c * 1.3;
    
    -- Estimate duration: 30 km/h average
    duration_min := (dist_km / 30.0) * 60.0;
    
    calculated_fare := (base_fare + (dist_km * price_per_km) + (duration_min * price_per_min)) * surge_multiplier + booking_fee;
    
    IF calculated_fare < min_fare THEN
        calculated_fare := min_fare;
    END IF;
    
    -- Always override client's estimated_fare with server calculated
    NEW.estimated_fare := ROUND(calculated_fare);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for ride inserts
DROP TRIGGER IF EXISTS trg_calculate_fare ON public.rides;
CREATE TRIGGER trg_calculate_fare
BEFORE INSERT ON public.rides
FOR EACH ROW
EXECUTE FUNCTION public.calculate_ride_fare();

-- 2. Secure Driver Location Updates
DROP POLICY IF EXISTS "Driver insert location updates" ON public.ride_location_updates;
CREATE POLICY "Driver insert location updates" ON public.ride_location_updates 
FOR INSERT TO authenticated 
WITH CHECK (
    driver_id IN (SELECT id FROM public.drivers WHERE profile_id = auth.uid() AND verification_status = 'approved' AND is_active = true)
    AND ride_id IN (
        SELECT id FROM public.rides 
        WHERE driver_id = (SELECT id FROM public.drivers WHERE profile_id = auth.uid())
        AND status IN ('driver_assigned', 'arrived', 'in_transit')
    )
);

-- 3. Audit Logging
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    target_id TEXT,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Protect audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to log ride status changes
CREATE OR REPLACE FUNCTION public.log_ride_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN
        INSERT INTO public.audit_logs (actor_id, action, target_entity, target_id, old_value, new_value)
        VALUES (auth.uid(), 'RIDE_STATUS_CHANGE', 'rides', NEW.id::text, jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_ride_status 
AFTER UPDATE ON public.rides 
FOR EACH ROW 
EXECUTE FUNCTION public.log_ride_audit();
