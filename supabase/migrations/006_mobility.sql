-- Migration: 006_mobility.sql
-- Description: Kafrawy Go Mobility Module schema

-- Drivers Profile
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE RESTRICT,
    national_id VARCHAR(50) NOT NULL UNIQUE,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    approval_status public.verification_status_enum NOT NULL DEFAULT 'pending',
    is_online BOOLEAN NOT NULL DEFAULT false,
    rating_average NUMERIC(3, 2) NOT NULL DEFAULT 0.00 CHECK (rating_average BETWEEN 0 AND 5.00),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INT NOT NULL CHECK (year >= 2000),
    plate_number VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rides
CREATE TABLE IF NOT EXISTS public.rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE RESTRICT,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    pickup_address_text TEXT NOT NULL,
    pickup_latitude NUMERIC(10, 8) NOT NULL,
    pickup_longitude NUMERIC(11, 8) NOT NULL,
    pickup_location geography(POINT, 4326),
    dropoff_address_text TEXT NOT NULL,
    dropoff_latitude NUMERIC(10, 8) NOT NULL,
    dropoff_longitude NUMERIC(11, 8) NOT NULL,
    dropoff_location geography(POINT, 4326),
    estimated_fare NUMERIC(10, 2) CHECK (estimated_fare >= 0),
    final_fare NUMERIC(10, 2) CHECK (final_fare >= 0),
    status public.ride_status_enum NOT NULL DEFAULT 'requested',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ride Status History
CREATE TABLE IF NOT EXISTS public.ride_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
    status public.ride_status_enum NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- High-throughput Live Location Tracking
CREATE TABLE IF NOT EXISTS public.ride_location_updates (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    latitude NUMERIC(10, 8) NOT NULL,
    longitude NUMERIC(11, 8) NOT NULL,
    location geography(POINT, 4326),
    heading NUMERIC(5, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
