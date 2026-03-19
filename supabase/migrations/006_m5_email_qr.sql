-- Migration 006: M5 Email + QR Code System
-- Creates the qrcodes storage bucket used by the confirmation email flow.
-- The bucket is public so QR PNG URLs work in emails without auth.

-- 1. qrcodes storage bucket (public, so img src works in emails)
INSERT INTO storage.buckets (id, name, public)
VALUES ('qrcodes', 'qrcodes', true)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS: Anyone can read (public bucket, needed for email img tags)
DROP POLICY IF EXISTS "QR codes public read" ON storage.objects;
CREATE POLICY "QR codes public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'qrcodes');

-- 3. RLS: Service role can insert/update/delete (API route uses service role key)
DROP POLICY IF EXISTS "QR codes service write" ON storage.objects;
CREATE POLICY "QR codes service write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'qrcodes');

DROP POLICY IF EXISTS "QR codes service update" ON storage.objects;
CREATE POLICY "QR codes service update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'qrcodes');

DROP POLICY IF EXISTS "QR codes service delete" ON storage.objects;
CREATE POLICY "QR codes service delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'qrcodes');
