-- Migration: 016_auto_assign_first_admin.sql
-- Description: Automatically assign admin role to cfo.moaz@gmail.com and ensure first user is admin if none exist.

DO $$
DECLARE
    target_user_id UUID;
    admin_role_id UUID;
BEGIN
    -- Get admin role id
    SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin' LIMIT 1;
    
    IF admin_role_id IS NOT NULL THEN
        -- Find user by email cfo.moaz@gmail.com
        SELECT id INTO target_user_id FROM auth.users WHERE email = 'cfo.moaz@gmail.com' LIMIT 1;
        
        -- If not found, pick the first user in auth.users
        IF target_user_id IS NULL THEN
            SELECT id INTO target_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
        END IF;

        IF target_user_id IS NOT NULL THEN
            -- Ensure profile exists
            INSERT INTO public.profiles (id, full_name, phone_number)
            SELECT target_user_id, 'System Admin', '01000000000'
            WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id);

            -- Assign admin role
            INSERT INTO public.user_roles (profile_id, role_id)
            VALUES (target_user_id, admin_role_id)
            ON CONFLICT (profile_id, role_id) DO NOTHING;
        END IF;
    END IF;
END $$;
