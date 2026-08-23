-- Migration: 009_indexes.sql
-- Description: Indexes for foreign keys, statuses, soft deletes, spatial locations, and text search

-- Core Foreign Keys & Search Indexes
CREATE INDEX IF NOT EXISTS idx_addresses_profile_id ON public.addresses(profile_id);
CREATE INDEX IF NOT EXISTS idx_addresses_location_gist ON public.addresses USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_notifications_profile_read ON public.notifications(profile_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_entity, target_id);

-- Services Module Indexes
CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services(category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_services_title_trgm ON public.services USING GIN (title_ar gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_service_providers_profile ON public.service_providers(profile_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_service_requests_customer ON public.service_requests(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_service_requests_provider ON public.service_requests(provider_id, status);

-- Mobility (Kafrawy Go) Indexes
CREATE INDEX IF NOT EXISTS idx_drivers_profile ON public.drivers(profile_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_online_status ON public.drivers(is_online, approval_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_driver ON public.vehicles(driver_id);

CREATE INDEX IF NOT EXISTS idx_rides_customer ON public.rides(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_rides_driver ON public.rides(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_rides_pickup_gist ON public.rides USING GIST (pickup_location);
CREATE INDEX IF NOT EXISTS idx_rides_dropoff_gist ON public.rides USING GIST (dropoff_location);

CREATE INDEX IF NOT EXISTS idx_ride_location_updates_ride_time ON public.ride_location_updates(ride_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ride_location_updates_driver ON public.ride_location_updates(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ride_location_updates_gist ON public.ride_location_updates USING GIST (location);

-- Jobs Module Indexes
CREATE INDEX IF NOT EXISTS idx_employers_profile ON public.employers(profile_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_posts_employer ON public.job_posts(employer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_posts_category ON public.job_posts(category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_posts_title_trgm ON public.job_posts USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_job_applications_post ON public.job_applications(job_post_id, status);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant ON public.job_applications(applicant_id);

-- Marketplace Indexes
CREATE INDEX IF NOT EXISTS idx_merchants_profile ON public.merchants(profile_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_merchant ON public.products(merchant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_title_trgm ON public.products USING GIN (title_ar gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_merchant ON public.orders(merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
