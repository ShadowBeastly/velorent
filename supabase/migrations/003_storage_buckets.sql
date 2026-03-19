-- M4: Storage buckets for digital signatures and signed contracts
-- Run once against your Supabase project.
-- Buckets can also be created via the Supabase Dashboard → Storage.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('signatures', 'signatures', true,  5242880,  ARRAY['image/png', 'image/jpeg']),
  ('contracts',  'contracts',  false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- ── RLS: signatures bucket ────────────────────────────────────────────────────

-- Authenticated users (providers / admins) can upload
CREATE POLICY "signatures_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'signatures');

-- Authenticated users can read (needed for PDF download)
CREATE POLICY "signatures_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'signatures');

-- ── RLS: contracts bucket ─────────────────────────────────────────────────────

CREATE POLICY "contracts_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contracts');

CREATE POLICY "contracts_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'contracts');
