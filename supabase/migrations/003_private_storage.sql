-- ============================================================
-- StitchOps Private Storage Migration
--
-- Changes the production-photos bucket from public to private.
-- Implements RLS policies on storage.objects so that:
--   - Authenticated merchandisers can upload and read all photos
--   - Supervisors can read photos for orders in their unit
--   - Buyers cannot directly access storage (they get signed URLs)
--   - No anonymous access is permitted
-- ============================================================

-- Step 1: Make the bucket private (if it exists as public)
-- This SQL updates the bucket to be non-public.
-- In Supabase, bucket privacy is controlled by the `public` boolean column.
UPDATE storage.buckets
SET public = false
WHERE id = 'production-photos';

-- If the bucket doesn't exist yet, create it as private:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'production-photos',
  'production-photos',
  false,  -- PRIVATE bucket — no public URLs
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- Step 2: Storage RLS policies
-- Enable RLS on storage.objects (Supabase does this by default)
-- But we explicitly add policies for our bucket.

-- Policy: Only authenticated users can INSERT into production-photos
DROP POLICY IF EXISTS "Authenticated users can upload production photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload production photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'production-photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('merchandiser', 'supervisor')
    )
  );

-- Policy: Merchandisers can SELECT (read) all production photos
DROP POLICY IF EXISTS "Merchandisers can read all production photos" ON storage.objects;
CREATE POLICY "Merchandisers can read all production photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'production-photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'merchandiser'
    )
  );

-- Policy: Supervisors can SELECT photos for orders in their production unit
-- The photo path format is: production/{order_id}/{filename}
-- We match the order_id from the storage path using a LIKE pattern and
-- check if the order belongs to the supervisor's production unit.
-- Note: storage.foldername() returns text[] so we use LIKE matching instead.
DROP POLICY IF EXISTS "Supervisors can read photos for their unit orders" ON storage.objects;
CREATE POLICY "Supervisors can read photos for their unit orders"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'production-photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'supervisor'
      AND p.production_unit_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.production_unit_id = p.production_unit_id
        AND name LIKE 'production/' || o.id::text || '/%'
      )
    )
  );

-- Policy: Buyers CANNOT directly access storage.objects
-- Buyers receive signed URLs generated server-side after token validation.
-- No SELECT policy is created for buyers — they have no direct storage access.
-- The signed URL API route uses the service role key (server-side only) to
-- generate time-limited URLs after verifying buyer authorization.

-- Policy: Only the uploader can DELETE their own photos (safety)
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
CREATE POLICY "Users can delete their own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'production-photos'
    AND owner = auth.uid()
  );

-- Step 3: Revoke any previously granted public access
-- Ensure no anon role can read from this bucket
REVOKE ALL ON storage.objects FROM anon;
