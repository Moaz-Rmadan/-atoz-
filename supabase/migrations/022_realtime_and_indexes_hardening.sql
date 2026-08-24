-- Migration: 022_realtime_and_indexes_hardening.sql
-- Description: Indexes optimization, Realtime publication subscriptions, and Geolocation validation constraint

-- 1. Ensure Performance Indexes
CREATE INDEX IF NOT EXISTS idx_rides_status ON public.rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_customer_id ON public.rides(customer_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON public.rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_created_at_desc ON public.rides(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drivers_approval_online ON public.drivers(approval_status, is_online);
CREATE INDEX IF NOT EXISTS idx_ride_loc_ride_created ON public.ride_location_updates(ride_id, created_at DESC);

-- 2. Add Geolocation Check Constraints to reject impossible coordinates
ALTER TABLE public.rides
DROP CONSTRAINT IF EXISTS chk_rides_pickup_coords,
DROP CONSTRAINT IF EXISTS chk_rides_dropoff_coords;

ALTER TABLE public.rides
ADD CONSTRAINT chk_rides_pickup_coords CHECK (
    pickup_latitude >= -90 AND pickup_latitude <= 90 AND
    pickup_longitude >= -180 AND pickup_longitude <= 180
),
ADD CONSTRAINT chk_rides_dropoff_coords CHECK (
    dropoff_latitude >= -90 AND dropoff_latitude <= 90 AND
    dropoff_longitude >= -180 AND dropoff_longitude <= 180
);

ALTER TABLE public.ride_location_updates
DROP CONSTRAINT IF EXISTS chk_loc_updates_coords;

ALTER TABLE public.ride_location_updates
ADD CONSTRAINT chk_loc_updates_coords CHECK (
    latitude >= -90 AND latitude <= 90 AND
    longitude >= -180 AND longitude <= 180
);

-- 3. Enable Realtime Publications for Rides & Location updates if publication exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
        EXCEPTION WHEN duplicate_object THEN
            -- Table already in publication
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_location_updates;
        EXCEPTION WHEN duplicate_object THEN
            -- Table already in publication
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
        EXCEPTION WHEN duplicate_object THEN
            -- Table already in publication
        END;
    END IF;
END $$;
