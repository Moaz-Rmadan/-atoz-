-- Migration: 010_functions_and_triggers.sql
-- Description: Functions, status state machine validators, and automated triggers

-- 1. Helper Function: Updated At Timestamp Handler
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply updated_at triggers
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_service_providers_updated_at BEFORE UPDATE ON public.service_providers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_service_requests_updated_at BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_rides_updated_at BEFORE UPDATE ON public.rides FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_employers_updated_at BEFORE UPDATE ON public.employers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_job_posts_updated_at BEFORE UPDATE ON public.job_posts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_job_applications_updated_at BEFORE UPDATE ON public.job_applications FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_merchants_updated_at BEFORE UPDATE ON public.merchants FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Automatic Profile & Default Role Creation on auth.users Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id UUID;
BEGIN
    -- Insert profile
    INSERT INTO public.profiles (id, full_name, phone_number, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'مستخدم جديد'),
        NEW.phone,
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Assign 'customer' role by default
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'customer' LIMIT 1;
    IF default_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (profile_id, role_id)
        VALUES (NEW.id, default_role_id)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Create empty cart
    INSERT INTO public.carts (profile_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;

    -- Create notification preferences
    INSERT INTO public.notification_preferences (profile_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. PostGIS Location Sync Function (lat/lng to geography POINT)
CREATE OR REPLACE FUNCTION public.sync_geography_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_addresses_sync_loc BEFORE INSERT OR UPDATE OF latitude, longitude ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.sync_geography_location();
CREATE TRIGGER trg_ride_updates_sync_loc BEFORE INSERT OR UPDATE OF latitude, longitude ON public.ride_location_updates FOR EACH ROW EXECUTE FUNCTION public.sync_geography_location();

-- 4. Ride Status State Machine Validator
CREATE OR REPLACE FUNCTION public.validate_ride_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'requested' AND NEW.status NOT IN ('driver_assigned', 'cancelled') THEN
        RAISE EXCEPTION 'انتقال غير مسموح لحالة الرحلة من requested إلى %', NEW.status;
    ELSIF OLD.status = 'driver_assigned' AND NEW.status NOT IN ('arrived', 'cancelled') THEN
        RAISE EXCEPTION 'انتقال غير مسموح لحالة الرحلة من driver_assigned إلى %', NEW.status;
    ELSIF OLD.status = 'arrived' AND NEW.status NOT IN ('in_transit', 'cancelled') THEN
        RAISE EXCEPTION 'انتقال غير مسموح لحالة الرحلة من arrived إلى %', NEW.status;
    ELSIF OLD.status = 'in_transit' AND NEW.status NOT IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'انتقال غير مسموح لحالة الرحلة من in_transit إلى %', NEW.status;
    ELSIF OLD.status IN ('completed', 'cancelled') AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION 'لا يمكن تغيير حالة رحلة منتهية أو ملغاة';
    END IF;

    -- Insert into history automatically
    IF OLD.status <> NEW.status THEN
        INSERT INTO public.ride_status_history (ride_id, status, changed_by)
        VALUES (NEW.id, NEW.status, auth.uid());
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_validate_ride_status BEFORE UPDATE OF status ON public.rides FOR EACH ROW EXECUTE FUNCTION public.validate_ride_status_transition();

-- 5. Order Status State Machine Validator
CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'pending' AND NEW.status NOT IN ('confirmed', 'cancelled') THEN
        RAISE EXCEPTION 'انتقال غير مسموح لحالة الطلب من pending إلى %', NEW.status;
    ELSIF OLD.status = 'confirmed' AND NEW.status NOT IN ('processing', 'cancelled') THEN
        RAISE EXCEPTION 'انتقال غير مسموح لحالة الطلب من confirmed إلى %', NEW.status;
    ELSIF OLD.status = 'processing' AND NEW.status NOT IN ('out_for_delivery', 'cancelled') THEN
        RAISE EXCEPTION 'انتقال غير مسموح لحالة الطلب من processing إلى %', NEW.status;
    ELSIF OLD.status = 'out_for_delivery' AND NEW.status NOT IN ('delivered', 'cancelled') THEN
        RAISE EXCEPTION 'انتقال غير مسموح لحالة الطلب من out_for_delivery إلى %', NEW.status;
    ELSIF OLD.status IN ('delivered', 'cancelled') AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION 'لا يمكن تغيير حالة طلب مكتمل أو ملغى';
    END IF;

    -- Insert into order status history
    IF OLD.status <> NEW.status THEN
        INSERT INTO public.order_status_history (order_id, status, changed_by)
        VALUES (NEW.id, NEW.status, auth.uid());
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_validate_order_status BEFORE UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.validate_order_status_transition();

-- 6. Helper Security Functions for RLS
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.profile_id = user_id AND r.name = role_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.has_role(user_id, 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.has_permission(user_id UUID, perm_code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    IF public.is_admin(user_id) THEN
        RETURN true;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.profile_id = user_id AND p.code = perm_code
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 7. Trigger to Prevent Deleting the Last Admin in the System
CREATE OR REPLACE FUNCTION public.prevent_delete_last_admin()
RETURNS TRIGGER AS $$
DECLARE
    admin_count INTEGER;
    admin_role_id UUID;
BEGIN
    -- Get admin role id
    SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin' LIMIT 1;
    
    -- Check if the role being deleted or modified is the admin role
    IF (TG_OP = 'DELETE' AND OLD.role_id = admin_role_id) OR 
       (TG_OP = 'UPDATE' AND OLD.role_id = admin_role_id AND NEW.role_id <> admin_role_id) THEN
        
        -- Count how many admins are left
        SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role_id = admin_role_id;
        
        IF admin_count <= 1 THEN
            RAISE EXCEPTION 'لا يمكن حذف المشرف الأخير في النظام لمنع قفل لوحة التحكم.';
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_delete_last_admin ON public.user_roles;
CREATE TRIGGER trg_prevent_delete_last_admin
    BEFORE DELETE OR UPDATE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_delete_last_admin();

-- 8. Triggers to Automatically Log Entity Verification and Approval Changes
CREATE OR REPLACE FUNCTION public.log_entity_approval_change()
RETURNS TRIGGER AS $$
DECLARE
    old_status TEXT;
    new_status TEXT;
    action_type TEXT;
BEGIN
    IF TG_TABLE_NAME = 'merchants' THEN
        old_status := OLD.approval_status::TEXT;
        new_status := NEW.approval_status::TEXT;
    ELSIF TG_TABLE_NAME = 'service_providers' THEN
        old_status := OLD.verification_status::TEXT;
        new_status := NEW.verification_status::TEXT;
    ELSIF TG_TABLE_NAME = 'drivers' THEN
        old_status := OLD.approval_status::TEXT;
        new_status := NEW.approval_status::TEXT;
    END IF;

    IF old_status <> new_status THEN
        action_type := TG_TABLE_NAME || '_' || new_status;
        INSERT INTO public.audit_logs (actor_id, action, target_entity, target_id, old_value, new_value)
        VALUES (
            auth.uid(),
            action_type,
            TG_TABLE_NAME,
            NEW.id,
            jsonb_build_object('status', old_status),
            jsonb_build_object('status', new_status)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_log_merchant_approval ON public.merchants;
CREATE TRIGGER trg_log_merchant_approval
    AFTER UPDATE OF approval_status ON public.merchants
    FOR EACH ROW EXECUTE FUNCTION public.log_entity_approval_change();

DROP TRIGGER IF EXISTS trg_log_provider_approval ON public.service_providers;
CREATE TRIGGER trg_log_provider_approval
    AFTER UPDATE OF verification_status ON public.service_providers
    FOR EACH ROW EXECUTE FUNCTION public.log_entity_approval_change();

DROP TRIGGER IF EXISTS trg_log_driver_approval ON public.drivers;
CREATE TRIGGER trg_log_driver_approval
    AFTER UPDATE OF approval_status ON public.drivers
    FOR EACH ROW EXECUTE FUNCTION public.log_entity_approval_change();

-- 9. Trigger to Log User Role Assignment/Removal in Audit Logs
CREATE OR REPLACE FUNCTION public.log_user_role_change()
RETURNS TRIGGER AS $$
DECLARE
    role_name TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT name INTO role_name FROM public.roles WHERE id = NEW.role_id;
        INSERT INTO public.audit_logs (actor_id, action, target_entity, target_id, new_value)
        VALUES (
            auth.uid(),
            'role_assigned',
            'user_roles',
            NEW.profile_id,
            jsonb_build_object('role', role_name)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT name INTO role_name FROM public.roles WHERE id = OLD.role_id;
        INSERT INTO public.audit_logs (actor_id, action, target_entity, target_id, old_value)
        VALUES (
            auth.uid(),
            'role_removed',
            'user_roles',
            OLD.profile_id,
            jsonb_build_object('role', role_name)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_log_user_role_change ON public.user_roles;
CREATE TRIGGER trg_log_user_role_change
    AFTER INSERT OR DELETE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.log_user_role_change();
