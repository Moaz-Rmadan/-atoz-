-- Migration: 002_types_and_enums_or_checks.sql
-- Description: Custom Domain ENUMs for domain entities in Kafrawy Super App

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status_enum') THEN
        CREATE TYPE public.verification_status_enum AS ENUM ('pending', 'approved', 'rejected', 'suspended');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_request_status_enum') THEN
        CREATE TYPE public.service_request_status_enum AS ENUM ('draft', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ride_status_enum') THEN
        CREATE TYPE public.ride_status_enum AS ENUM ('requested', 'driver_assigned', 'arrived', 'in_transit', 'completed', 'cancelled');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_application_status_enum') THEN
        CREATE TYPE public.job_application_status_enum AS ENUM ('submitted', 'reviewed', 'shortlisted', 'accepted', 'rejected');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_type_enum') THEN
        CREATE TYPE public.job_type_enum AS ENUM ('full_time', 'part_time', 'freelance', 'contract', 'internship');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_enum') THEN
        CREATE TYPE public.order_status_enum AS ENUM ('pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled');
    END IF;
END $$;
