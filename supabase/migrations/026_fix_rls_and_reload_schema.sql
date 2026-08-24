-- Migration: 026_fix_rls_and_reload_schema.sql
-- Description: Fix ride_location_updates RLS policy and force PostgREST schema cache reload for mark_cash_payment_received and other RPCs.

-- 1. Fix ride_location_updates INSERT policy to allow approved drivers to update their location reliably
DROP POLICY IF EXISTS "Driver insert location updates" ON public.ride_location_updates;
CREATE POLICY "Driver insert location updates" ON public.ride_location_updates 
FOR INSERT TO authenticated 
WITH CHECK (
    driver_id IN (
        SELECT id FROM public.drivers 
        WHERE profile_id = auth.uid() 
          AND approval_status = 'approved'
    )
);

-- 2. Ensure execute permissions on mark_cash_payment_received
GRANT EXECUTE ON FUNCTION public.mark_cash_payment_received(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_cash_payment_received(UUID) FROM anon;

GRANT EXECUTE ON FUNCTION public.driver_accept_ride(UUID, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.driver_accept_ride(UUID, UUID) FROM anon;

GRANT EXECUTE ON FUNCTION public.driver_respond_to_dispatch(UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.driver_respond_to_dispatch(UUID, TEXT) FROM anon;

-- 3. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
