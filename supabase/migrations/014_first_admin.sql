-- Migration: 014_first_admin.sql
-- Description: Assigns the first Administrator role to the specified UUID.
-- Replace <MY_USER_UUID> with the actual UUID of the first administrator.
-- This script must be run manually in Supabase SQL Editor.

-- To find your user UUID, run:
-- SELECT id, full_name, phone_number FROM public.profiles;

INSERT INTO public.user_roles (profile_id, role_id)
SELECT
    '<MY_USER_UUID>'::uuid,
    id
FROM public.roles
WHERE name = 'admin'
ON CONFLICT (profile_id, role_id) DO NOTHING;
