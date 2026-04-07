-- Create storage bucket for captured photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('photo-captures', 'photo-captures', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload (kiosk doesn't have auth)
CREATE POLICY "Anyone can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'photo-captures');

-- Allow anyone to view photos
CREATE POLICY "Anyone can view photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'photo-captures');