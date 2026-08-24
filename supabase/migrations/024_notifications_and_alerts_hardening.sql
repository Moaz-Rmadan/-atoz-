-- Migration: 024_notifications_and_alerts_hardening.sql
-- Description: Advanced Notification Center, Operations Alert Engine, RLS, Realtime, and Deduplication Hardening

-- 1. Enhance public.notifications table with all required columns and constraints
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE NULL,
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NULL,
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NULL,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS dedup_key VARCHAR(255) UNIQUE NULL,
ADD COLUMN IF NOT EXISTS severity VARCHAR(50) DEFAULT 'info', -- 'info', 'warning', 'critical'
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'; -- 'active', 'acknowledged', 'resolved'

-- Sync profile_id with recipient_id and body with message and payload with data if null
UPDATE public.notifications SET recipient_id = profile_id WHERE recipient_id IS NULL AND profile_id IS NOT NULL;
UPDATE public.notifications SET profile_id = recipient_id WHERE profile_id IS NULL AND recipient_id IS NOT NULL;
UPDATE public.notifications SET message = body WHERE message IS NULL AND body IS NOT NULL;
UPDATE public.notifications SET body = message WHERE body IS NULL AND message IS NOT NULL;
UPDATE public.notifications SET data = payload WHERE (data IS NULL OR data = '{}'::jsonb) AND payload IS NOT NULL;
UPDATE public.notifications SET payload = data WHERE (payload IS NULL OR payload = '{}'::jsonb) AND data IS NOT NULL;

-- 2. Create trigger to keep recipient_id/profile_id, message/body, data/payload synchronized
CREATE OR REPLACE FUNCTION public.sync_notification_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.recipient_id IS NULL AND NEW.profile_id IS NOT NULL THEN
        NEW.recipient_id := NEW.profile_id;
    ELSIF NEW.profile_id IS NULL AND NEW.recipient_id IS NOT NULL THEN
        NEW.profile_id := NEW.recipient_id;
    END IF;

    IF NEW.message IS NULL AND NEW.body IS NOT NULL THEN
        NEW.message := NEW.body;
    ELSIF NEW.body IS NULL AND NEW.message IS NOT NULL THEN
        NEW.body := NEW.message;
    END IF;

    IF NEW.data IS NULL OR NEW.data = '{}'::jsonb THEN
        IF NEW.payload IS NOT NULL THEN
            NEW.data := NEW.payload;
        END IF;
    ELSE
        NEW.payload := NEW.data;
    END IF;

    IF NEW.is_read = true AND NEW.read_at IS NULL THEN
        NEW.read_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_notification_fields ON public.notifications;
CREATE TRIGGER trg_sync_notification_fields
BEFORE INSERT OR UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.sync_notification_fields();

-- 3. RLS Policies Hardening for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications
FOR SELECT TO authenticated
USING (
    profile_id = auth.uid() OR 
    recipient_id = auth.uid() OR 
    public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
FOR UPDATE TO authenticated
USING (
    profile_id = auth.uid() OR 
    recipient_id = auth.uid() OR 
    public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "System or users insert notifications" ON public.notifications;
CREATE POLICY "System or users insert notifications" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (true);

-- 4. Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 5. Automated Trigger to generate Notifications on Ride Lifecycle Events
CREATE OR REPLACE FUNCTION public.generate_ride_lifecycle_notifications()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_profile_id UUID;
    v_driver_profile_id UUID;
    v_driver_name TEXT;
    v_admin_id UUID;
BEGIN
    -- Get customer profile id
    v_customer_profile_id := NEW.customer_id;

    -- Get driver profile id if assigned
    IF NEW.driver_id IS NOT NULL THEN
        SELECT profile_id INTO v_driver_profile_id FROM public.drivers WHERE id = NEW.driver_id;
        SELECT full_name INTO v_driver_name FROM public.profiles WHERE id = v_driver_profile_id;
    END IF;

    -- EVENT 1: Ride Requested (INSERT or status requested)
    IF (TG_OP = 'INSERT' AND NEW.status = 'requested') THEN
        -- Notify Customer
        INSERT INTO public.notifications (recipient_id, type, title, message, ride_id, customer_id, severity, dedup_key)
        VALUES (
            v_customer_profile_id,
            'ride_requested',
            'طلب رحلة جديدة',
            'تم إرسال طلب الرحلة بنجاح وجاري البحث عن كابتن قريب منك.',
            NEW.id,
            NEW.customer_id,
            'info',
            'req-' || NEW.id
        ) ON CONFLICT (dedup_key) DO NOTHING;

        -- Notify approved online drivers about new ride (Broadcast / or notification to nearby/all online drivers)
        -- For robust notification system, insert new_ride notification for all approved online drivers
        INSERT INTO public.notifications (recipient_id, type, title, message, ride_id, customer_id, severity, dedup_key)
        SELECT 
            d.profile_id,
            'new_ride',
            'رحلة جديدة متاحة',
            'رحلة جديدة من ' || LEFT(NEW.pickup_address_text, 30) || ' إلى ' || LEFT(NEW.dropoff_address_text, 30),
            NEW.id,
            NEW.customer_id,
            'warning',
            'new-ride-' || NEW.id || '-' || d.profile_id
        FROM public.drivers d
        WHERE d.is_online = true AND d.approval_status = 'approved'
        ON CONFLICT (dedup_key) DO NOTHING;

    -- EVENT 2: Driver Assigned
    ELSIF (OLD.status = 'requested' AND NEW.status = 'driver_assigned') THEN
        -- Notify Customer
        INSERT INTO public.notifications (recipient_id, type, title, message, ride_id, driver_id, customer_id, severity, dedup_key)
        VALUES (
            v_customer_profile_id,
            'driver_assigned',
            'تم قبول رحلتك',
            COALESCE(v_driver_name, 'الكابتن') || ' في طريقه إليك.',
            NEW.id,
            NEW.driver_id,
            NEW.customer_id,
            'info',
            'assigned-' || NEW.id
        ) ON CONFLICT (dedup_key) DO NOTHING;

        -- Notify Driver
        IF v_driver_profile_id IS NOT NULL THEN
            INSERT INTO public.notifications (recipient_id, type, title, message, ride_id, driver_id, severity, dedup_key)
            VALUES (
                v_driver_profile_id,
                'ride_accepted',
                'تم تعيينك للرحلة',
                'لقد قبلت الرحلة بنجاح. توجه إلى موقع الركوب.',
                NEW.id,
                NEW.driver_id,
                'info',
                'driver-accepted-' || NEW.id
            ) ON CONFLICT (dedup_key) DO NOTHING;
        END IF;

    -- EVENT 3: Driver Arriving / Arrived
    ELSIF (OLD.status <> 'arrived' AND NEW.status = 'arrived') THEN
        INSERT INTO public.notifications (recipient_id, type, title, message, ride_id, driver_id, customer_id, severity, dedup_key)
        VALUES (
            v_customer_profile_id,
            'driver_arrived',
            'الكابتن وصل',
            'الكابتن وصل إلى موقعك المحدد. يرجى التوجه إليه.',
            NEW.id,
            NEW.driver_id,
            NEW.customer_id,
            'warning',
            'arrived-' || NEW.id
        ) ON CONFLICT (dedup_key) DO NOTHING;

    -- EVENT 4: Ride Started (in_transit)
    ELSIF (OLD.status <> 'in_transit' AND NEW.status = 'in_transit') THEN
        INSERT INTO public.notifications (recipient_id, type, title, message, ride_id, driver_id, customer_id, severity, dedup_key)
        VALUES (
            v_customer_profile_id,
            'ride_started',
            'بدأت الرحلة',
            'نتمنى لك رحلة آمنة ومريحة مع Kafrawy Go.',
            NEW.id,
            NEW.driver_id,
            NEW.customer_id,
            'info',
            'started-' || NEW.id
        ) ON CONFLICT (dedup_key) DO NOTHING;

    -- EVENT 5: Ride Completed (completed)
    ELSIF (OLD.status <> 'completed' AND NEW.status = 'completed') THEN
        -- Notify Customer: cash payment pending
        INSERT INTO public.notifications (recipient_id, type, title, message, ride_id, driver_id, customer_id, severity, dedup_key)
        VALUES (
            v_customer_profile_id,
            'cash_payment_pending',
            'انتهت الرحلة - مطلوب الدفع نقداً',
            'يرجى دفع مبلغ ' || COALESCE(NEW.customer_total, NEW.estimated_fare, 0) || ' ج.م نقداً للكابتن.',
            NEW.id,
            NEW.driver_id,
            NEW.customer_id,
            'warning',
            'completed-cust-' || NEW.id
        ) ON CONFLICT (dedup_key) DO NOTHING;

        -- Notify Driver: cash pending collection
        IF v_driver_profile_id IS NOT NULL THEN
            INSERT INTO public.notifications (recipient_id, type, title, message, ride_id, driver_id, severity, dedup_key)
            VALUES (
                v_driver_profile_id,
                'cash_pending',
                'انتهت الرحلة - يرجى تحصيل الكاش',
                'يرجى تحصيل مبلغ ' || COALESCE(NEW.customer_total, NEW.estimated_fare, 0) || ' ج.م نقداً من العميل.',
                NEW.id,
                NEW.driver_id,
                'warning',
                'completed-drv-' || NEW.id
            ) ON CONFLICT (dedup_key) DO NOTHING;
        END IF;

    -- EVENT 6: Cash Payment Received (payment_status changed to paid_cash)
    ELSIF (OLD.payment_status <> 'paid_cash' AND NEW.payment_status = 'paid_cash') THEN
        -- Notify Customer
        INSERT INTO public.notifications (recipient_id, type, title, message, ride_id, customer_id, severity, dedup_key)
        VALUES (
            v_customer_profile_id,
            'cash_payment_received',
            'تم تأكيد الدفع نقداً',
            'شكراً لك! تم تسجيل استلام قيمة الرحلة نقداً بنجاح.',
            NEW.id,
            NEW.customer_id,
            'info',
            'paid-cust-' || NEW.id
        ) ON CONFLICT (dedup_key) DO NOTHING;

        -- Notify Driver
        IF v_driver_profile_id IS NOT NULL THEN
            INSERT INTO public.notifications (recipient_id, type, title, message, ride_id, driver_id, severity, dedup_key)
            VALUES (
                v_driver_profile_id,
                'cash_pending',
                'تم استلام الكاش بنجاح',
                'تم تأكيد تحصيل مبلغ الرحلة بنجاح.',
                NEW.id,
                NEW.driver_id,
                'info',
                'paid-drv-' || NEW.id
            ) ON CONFLICT (dedup_key) DO NOTHING;
        END IF;

    -- EVENT 7: Ride Cancelled
    ELSIF (OLD.status <> 'cancelled' AND NEW.status = 'cancelled') THEN
        INSERT INTO public.notifications (recipient_id, type, title, message, ride_id, customer_id, severity, dedup_key)
        VALUES (
            v_customer_profile_id,
            'ride_cancelled',
            'تم إلغاء الرحلة',
            'عذراً، تم إلغاء الرحلة.',
            NEW.id,
            NEW.customer_id,
            'warning',
            'cancelled-cust-' || NEW.id
        ) ON CONFLICT (dedup_key) DO NOTHING;

        IF v_driver_profile_id IS NOT NULL THEN
            INSERT INTO public.notifications (recipient_id, type, title, message, ride_id, driver_id, severity, dedup_key)
            VALUES (
                v_driver_profile_id,
                'customer_cancelled',
                'العميل ألغى الرحلة',
                'تم إلغاء الرحلة بواسطة العميل.',
                NEW.id,
                NEW.driver_id,
                'warning',
                'cancelled-drv-' || NEW.id
            ) ON CONFLICT (dedup_key) DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ride_lifecycle_notifications ON public.rides;
CREATE TRIGGER trg_ride_lifecycle_notifications
AFTER INSERT OR UPDATE ON public.rides
FOR EACH ROW EXECUTE FUNCTION public.generate_ride_lifecycle_notifications();
