-- Migration: 011_rls.sql
-- Description: Enables Row Level Security (RLS) and defines production security policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_provider_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_request_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_location_updates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
CREATE POLICY "Profiles readable by all authenticated users" ON public.profiles FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. ADDRESSES POLICIES
CREATE POLICY "Users read own addresses" ON public.addresses FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "Users manage own addresses" ON public.addresses FOR ALL TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- 3. ROLES & PERMISSIONS POLICIES
CREATE POLICY "Roles viewable by authenticated users" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage roles" ON public.roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Permissions viewable by authenticated users" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage permissions" ON public.permissions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Role permissions viewable by authenticated users" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage role_permissions" ON public.role_permissions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "User roles viewable by authenticated users" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage user_roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 4. NOTIFICATIONS POLICIES
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "Users manage own preferences" ON public.notification_preferences FOR ALL TO authenticated USING (profile_id = auth.uid());

-- 5. AUDIT LOGS POLICIES
CREATE POLICY "Audit logs readable only by admin" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- 6. SERVICES MODULE POLICIES
CREATE POLICY "Service categories public view" ON public.service_categories FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Services public view" ON public.services FOR SELECT TO authenticated USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "Service providers public view" ON public.service_providers FOR SELECT TO authenticated USING (verification_status = 'approved' OR profile_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Provider update own profile" ON public.service_providers FOR UPDATE TO authenticated USING (profile_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "User register provider profile" ON public.service_providers FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Provider categories viewable by authenticated" ON public.service_provider_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Provider manage own categories" ON public.service_provider_categories FOR ALL TO authenticated USING (
    provider_id IN (SELECT id FROM public.service_providers WHERE profile_id = auth.uid())
);

CREATE POLICY "Service requests customer/provider view" ON public.service_requests FOR SELECT TO authenticated USING (
    customer_id = auth.uid() OR 
    provider_id IN (SELECT id FROM public.service_providers WHERE profile_id = auth.uid()) OR
    public.is_admin(auth.uid())
);
CREATE POLICY "Customer create service request" ON public.service_requests FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Involved parties update service request" ON public.service_requests FOR UPDATE TO authenticated USING (
    customer_id = auth.uid() OR 
    provider_id IN (SELECT id FROM public.service_providers WHERE profile_id = auth.uid()) OR
    public.is_admin(auth.uid())
);

CREATE POLICY "Status history viewable by request parties" ON public.service_request_status_history FOR SELECT TO authenticated USING (
    request_id IN (
        SELECT id FROM public.service_requests 
        WHERE customer_id = auth.uid() 
           OR provider_id IN (SELECT id FROM public.service_providers WHERE profile_id = auth.uid())
           OR public.is_admin(auth.uid())
    )
);

CREATE POLICY "Service reviews public view" ON public.service_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Customer create service review" ON public.service_reviews FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());

-- 7. KAFRAWY GO (MOBILITY) POLICIES
CREATE POLICY "Approved drivers view" ON public.drivers FOR SELECT TO authenticated USING (
    approval_status = 'approved' OR profile_id = auth.uid() OR public.is_admin(auth.uid())
);
CREATE POLICY "Driver manage own profile" ON public.drivers FOR UPDATE TO authenticated USING (profile_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "User register driver profile" ON public.drivers FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Vehicles viewable by driver or admin" ON public.vehicles FOR SELECT TO authenticated USING (
    driver_id IN (SELECT id FROM public.drivers WHERE profile_id = auth.uid()) OR public.is_admin(auth.uid())
);
CREATE POLICY "Driver manage own vehicles" ON public.vehicles FOR ALL TO authenticated USING (
    driver_id IN (SELECT id FROM public.drivers WHERE profile_id = auth.uid())
);

CREATE POLICY "Rides customer/driver view" ON public.rides FOR SELECT TO authenticated USING (
    customer_id = auth.uid() OR
    driver_id IN (SELECT id FROM public.drivers WHERE profile_id = auth.uid()) OR
    status = 'requested' OR
    public.is_admin(auth.uid())
);
CREATE POLICY "Customer create ride" ON public.rides FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Involved parties update ride" ON public.rides FOR UPDATE TO authenticated USING (
    customer_id = auth.uid() OR
    driver_id IN (SELECT id FROM public.drivers WHERE profile_id = auth.uid()) OR
    public.is_admin(auth.uid())
);

CREATE POLICY "Ride status history viewable by ride parties" ON public.ride_status_history FOR SELECT TO authenticated USING (
    ride_id IN (
        SELECT id FROM public.rides 
        WHERE customer_id = auth.uid() 
           OR driver_id IN (SELECT id FROM public.drivers WHERE profile_id = auth.uid())
           OR public.is_admin(auth.uid())
    )
);

CREATE POLICY "Live location viewable by assigned customer" ON public.ride_location_updates FOR SELECT TO authenticated USING (
    ride_id IN (SELECT id FROM public.rides WHERE customer_id = auth.uid()) OR
    driver_id IN (SELECT id FROM public.drivers WHERE profile_id = auth.uid())
);
CREATE POLICY "Driver insert location updates" ON public.ride_location_updates FOR INSERT TO authenticated WITH CHECK (
    driver_id IN (SELECT id FROM public.drivers WHERE profile_id = auth.uid())
);

-- 8. JOBS MODULE POLICIES
CREATE POLICY "Employers public view" ON public.employers FOR SELECT TO authenticated USING (
    verification_status = 'approved' OR profile_id = auth.uid() OR public.is_admin(auth.uid())
);
CREATE POLICY "Employer update own profile" ON public.employers FOR UPDATE TO authenticated USING (profile_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "User register employer profile" ON public.employers FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Job categories public view" ON public.job_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Job posts public view" ON public.job_posts FOR SELECT TO authenticated USING (is_active = true AND deleted_at IS NULL);
CREATE POLICY "Employers manage own job posts" ON public.job_posts FOR ALL TO authenticated USING (
    employer_id IN (SELECT id FROM public.employers WHERE profile_id = auth.uid())
);

CREATE POLICY "Job applications applicant/employer view" ON public.job_applications FOR SELECT TO authenticated USING (
    applicant_id = auth.uid() OR
    job_post_id IN (SELECT id FROM public.job_posts WHERE employer_id IN (SELECT id FROM public.employers WHERE profile_id = auth.uid()))
);
CREATE POLICY "Applicant create job application" ON public.job_applications FOR INSERT TO authenticated WITH CHECK (applicant_id = auth.uid());

CREATE POLICY "Resumes owner view/manage" ON public.resumes FOR ALL TO authenticated USING (profile_id = auth.uid());

-- 9. MARKETPLACE MODULE POLICIES
CREATE POLICY "Merchants public view" ON public.merchants FOR SELECT TO authenticated USING (
    approval_status = 'approved' OR profile_id = auth.uid() OR public.is_admin(auth.uid())
);
CREATE POLICY "Merchant update own profile" ON public.merchants FOR UPDATE TO authenticated USING (profile_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "User register merchant profile" ON public.merchants FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Product categories public view" ON public.product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Products public view" ON public.products FOR SELECT TO authenticated USING (is_active = true AND deleted_at IS NULL);
CREATE POLICY "Product images public view" ON public.product_images FOR SELECT TO authenticated USING (true);

CREATE POLICY "Merchants manage own products" ON public.products FOR ALL TO authenticated USING (
    merchant_id IN (SELECT id FROM public.merchants WHERE profile_id = auth.uid())
);

CREATE POLICY "Carts owner manage" ON public.carts FOR ALL TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "Cart items owner manage" ON public.cart_items FOR ALL TO authenticated USING (
    cart_id IN (SELECT id FROM public.carts WHERE profile_id = auth.uid())
);

CREATE POLICY "Orders customer/merchant view" ON public.orders FOR SELECT TO authenticated USING (
    customer_id = auth.uid() OR
    merchant_id IN (SELECT id FROM public.merchants WHERE profile_id = auth.uid()) OR
    public.is_admin(auth.uid())
);
CREATE POLICY "Customer create order" ON public.orders FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Involved parties update order" ON public.orders FOR UPDATE TO authenticated USING (
    customer_id = auth.uid() OR
    merchant_id IN (SELECT id FROM public.merchants WHERE profile_id = auth.uid()) OR
    public.is_admin(auth.uid())
);

CREATE POLICY "Order status history viewable by order parties" ON public.order_status_history FOR SELECT TO authenticated USING (
    order_id IN (
        SELECT id FROM public.orders 
        WHERE customer_id = auth.uid() 
           OR merchant_id IN (SELECT id FROM public.merchants WHERE profile_id = auth.uid())
           OR public.is_admin(auth.uid())
    )
);

CREATE POLICY "Order items viewable by order parties" ON public.order_items FOR SELECT TO authenticated USING (
    order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid() OR merchant_id IN (SELECT id FROM public.merchants WHERE profile_id = auth.uid()))
);

CREATE POLICY "Product reviews public view" ON public.product_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Customer create product review" ON public.product_reviews FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
