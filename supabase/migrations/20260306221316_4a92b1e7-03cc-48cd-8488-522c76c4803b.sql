
-- Drop existing policies first to avoid conflicts
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname IN (
      'Anyone can upload photos', 'Anyone can view photos', 'Admins can delete photos',
      'Anyone can view template assets', 'Admins can upload template assets', 'Admins can delete template assets',
      'Anyone can view promo materials', 'Admins can upload promo materials', 'Admins can delete promo materials',
      'Superadmin can manage all storage'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- photo-captures: anyone can upload and view (kiosk is public)
CREATE POLICY "Anyone can upload photos" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'photo-captures');
CREATE POLICY "Anyone can view photos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'photo-captures');
CREATE POLICY "Admins can delete photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'photo-captures' AND public.has_role(auth.uid(), 'admin'));

-- template-assets
CREATE POLICY "Anyone can view template assets" ON storage.objects FOR SELECT TO public USING (bucket_id = 'template-assets');
CREATE POLICY "Admins can upload template assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'template-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete template assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'template-assets' AND public.has_role(auth.uid(), 'admin'));

-- promo-materials
CREATE POLICY "Anyone can view promo materials" ON storage.objects FOR SELECT TO public USING (bucket_id = 'promo-materials');
CREATE POLICY "Admins can upload promo materials" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'promo-materials' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete promo materials" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'promo-materials' AND public.has_role(auth.uid(), 'admin'));

-- Superadmin full access
CREATE POLICY "Superadmin can manage all storage" ON storage.objects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin')) WITH CHECK (public.has_role(auth.uid(), 'superadmin'));
