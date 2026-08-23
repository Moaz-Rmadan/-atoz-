-- Migration: 012_storage.sql
-- Description: Creates Storage Buckets and Storage Security Policies in Supabase

-- Create Buckets idempotently
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('avatars', 'avatars', true),
    ('product-images', 'product-images', true),
    ('resumes', 'resumes', false),
    ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Storage Security Policies

-- 1. Avatars Bucket Policies
DROP POLICY IF EXISTS "Avatar Images Public Access" ON storage.objects;
CREATE POLICY "Avatar Images Public Access" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar Images Upload by Owner" ON storage.objects;
CREATE POLICY "Avatar Images Upload by Owner" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Avatar Images Delete by Owner" ON storage.objects;
CREATE POLICY "Avatar Images Delete by Owner" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'avatars' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- 2. Product Images Bucket Policies
DROP POLICY IF EXISTS "Product Images Public Access" ON storage.objects;
CREATE POLICY "Product Images Public Access" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Product Images Upload by Merchants" ON storage.objects;
CREATE POLICY "Product Images Upload by Merchants" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'product-images' AND
        EXISTS (
            SELECT 1 FROM public.merchants 
            WHERE profile_id = auth.uid()
        )
    );

-- 3. Resumes Bucket Policies (Private)
DROP POLICY IF EXISTS "Resumes Access by Owner or Employer" ON storage.objects;
CREATE POLICY "Resumes Access by Owner or Employer" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'resumes' AND
        (
            (storage.foldername(name))[1] = auth.uid()::text OR
            EXISTS (SELECT 1 FROM public.employers WHERE profile_id = auth.uid()) OR
            public.is_admin(auth.uid())
        )
    );

DROP POLICY IF EXISTS "Resumes Upload by Owner" ON storage.objects;
CREATE POLICY "Resumes Upload by Owner" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'resumes' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- 4. Verification Documents Bucket Policies (Strictly Private)
DROP POLICY IF EXISTS "Verification Docs Viewable by Owner or Admin" ON storage.objects;
CREATE POLICY "Verification Docs Viewable by Owner or Admin" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'verification-documents' AND
        (
            (storage.foldername(name))[1] = auth.uid()::text OR
            public.is_admin(auth.uid())
        )
    );

DROP POLICY IF EXISTS "Verification Docs Upload by Owner" ON storage.objects;
CREATE POLICY "Verification Docs Upload by Owner" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'verification-documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );
