-- Migration 007: M10 Condition Photos Storage Bucket
-- Creates the Supabase Storage bucket for handover/damage photo documentation

-- Create the condition-photos bucket (public: false → authenticated access only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'condition-photos',
    'condition-photos',
    false,
    10485760,  -- 10 MB per file
    '{"image/jpeg","image/png","image/webp"}'
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos
-- Path pattern: {org_id}/{booking_id}/{type}/{position}.jpg
CREATE POLICY "authenticated_insert_condition_photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'condition-photos');

-- Allow authenticated users to view photos
CREATE POLICY "authenticated_select_condition_photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'condition-photos');

-- Allow authenticated users to update (upsert) photos
CREATE POLICY "authenticated_update_condition_photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'condition-photos');

-- Allow authenticated users to delete photos
CREATE POLICY "authenticated_delete_condition_photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'condition-photos');
