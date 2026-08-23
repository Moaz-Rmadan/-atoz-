-- Migration: 001_extensions.sql
-- Description: Enables required PostgreSQL extensions for Supabase (PostGIS, pgcrypto, pg_trgm)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "postgis";
