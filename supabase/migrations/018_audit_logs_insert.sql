-- Migration: 018_audit_logs_insert.sql
-- Description: Allow authenticated users to insert into audit_logs (so triggers can insert)

CREATE POLICY "Admin insert audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
