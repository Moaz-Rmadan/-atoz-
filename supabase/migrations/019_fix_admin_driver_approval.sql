-- Migration: 019_fix_admin_driver_approval.sql
-- Description: Hardened Driver Approval flow with read-only is_admin/has_role and secure SECURITY DEFINER RPC

-- 1. Ensure has_role is strictly READ-ONLY and STABLE
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.profile_id = user_id AND r.name = role_name
    );
END;
$$;

-- 2. Ensure is_admin is strictly READ-ONLY and STABLE (no INSERT/UPDATE/DELETE)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.has_role(user_id, 'admin');
END;
$$;

-- 3. Production RPC for Driver Approval
CREATE OR REPLACE FUNCTION public.admin_approve_driver(
    p_driver_id UUID,
    p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_driver RECORD;
    v_driver_role_id UUID;
    v_status_enum public.verification_status_enum;
BEGIN
    -- Security Check: Caller MUST be authenticated and an Admin
    IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access Denied: Only admins can approve drivers.';
    END IF;

    -- Validate requested status against schema enum
    IF p_status NOT IN ('pending', 'approved', 'rejected', 'suspended') THEN
        RAISE EXCEPTION 'Invalid status. Allowed values: pending, approved, rejected, suspended.';
    END IF;

    v_status_enum := p_status::public.verification_status_enum;

    -- Check driver existence
    SELECT id, profile_id, approval_status
    INTO v_driver
    FROM public.drivers
    WHERE id = p_driver_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Driver not found.';
    END IF;

    -- Update driver approval status (triggers audit log trg_log_driver_approval automatically)
    UPDATE public.drivers
    SET
        approval_status = v_status_enum,
        updated_at = NOW()
    WHERE id = p_driver_id;

    -- If status is approved, assign driver role while preserving customer and other roles
    IF p_status = 'approved' THEN
        SELECT id
        INTO v_driver_role_id
        FROM public.roles
        WHERE name = 'driver'
        LIMIT 1;

        IF v_driver_role_id IS NULL THEN
            RAISE EXCEPTION 'Driver role does not exist.';
        END IF;

        INSERT INTO public.user_roles (
            profile_id,
            role_id
        )
        VALUES (
            v_driver.profile_id,
            v_driver_role_id
        )
        ON CONFLICT (profile_id, role_id) DO NOTHING;
    END IF;

    -- Return standard structured response
    RETURN jsonb_build_object(
        'success', true,
        'driver_id', v_driver.id,
        'profile_id', v_driver.profile_id,
        'approval_status', p_status
    );
END;
$$;

-- 4. Secure execute permissions
GRANT EXECUTE ON FUNCTION public.admin_approve_driver(UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_approve_driver(UUID, TEXT) FROM anon;
