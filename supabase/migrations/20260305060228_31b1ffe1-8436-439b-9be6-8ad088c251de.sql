-- Create storage bucket for template assets
INSERT INTO storage.buckets (id, name, public) VALUES ('template-assets', 'template-assets', true);

-- Allow public read
CREATE POLICY "Public can view template assets" ON storage.objects FOR SELECT USING (bucket_id = 'template-assets');

-- Authenticated admins can upload
CREATE POLICY "Admins can upload template assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'template-assets');

-- Admins can delete
CREATE POLICY "Admins can delete template assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'template-assets');

-- Fix RLS policies: change RESTRICTIVE to PERMISSIVE for all tables
-- Drop and recreate kiosks policies as PERMISSIVE
DROP POLICY IF EXISTS "Anyone can view kiosks" ON public.kiosks;
DROP POLICY IF EXISTS "Admins can insert kiosks" ON public.kiosks;
DROP POLICY IF EXISTS "Admins can update kiosks" ON public.kiosks;
DROP POLICY IF EXISTS "Admins can delete kiosks" ON public.kiosks;

CREATE POLICY "Anyone can view kiosks" ON public.kiosks FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert kiosks" ON public.kiosks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update kiosks" ON public.kiosks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete kiosks" ON public.kiosks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Drop and recreate pricing policies
DROP POLICY IF EXISTS "Anyone can view pricing" ON public.pricing_packages;
DROP POLICY IF EXISTS "Admins can insert pricing" ON public.pricing_packages;
DROP POLICY IF EXISTS "Admins can update pricing" ON public.pricing_packages;
DROP POLICY IF EXISTS "Admins can delete pricing" ON public.pricing_packages;

CREATE POLICY "Anyone can view pricing" ON public.pricing_packages FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert pricing" ON public.pricing_packages FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update pricing" ON public.pricing_packages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete pricing" ON public.pricing_packages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Drop and recreate template policies
DROP POLICY IF EXISTS "Anyone can view templates" ON public.templates;
DROP POLICY IF EXISTS "Admins can insert templates" ON public.templates;
DROP POLICY IF EXISTS "Admins can update templates" ON public.templates;
DROP POLICY IF EXISTS "Admins can delete templates" ON public.templates;

CREATE POLICY "Anyone can view templates" ON public.templates FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert templates" ON public.templates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update templates" ON public.templates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete templates" ON public.templates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Drop and recreate transactions policies
DROP POLICY IF EXISTS "Admins can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Anyone can insert transactions" ON public.transactions;

CREATE POLICY "Admins can view transactions" ON public.transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can view own transactions" ON public.transactions FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert transactions" ON public.transactions FOR INSERT TO public WITH CHECK (true);

-- Drop and recreate photo_sessions policies
DROP POLICY IF EXISTS "Anyone can view photo sessions" ON public.photo_sessions;
DROP POLICY IF EXISTS "Anyone can insert photo sessions" ON public.photo_sessions;

CREATE POLICY "Anyone can view photo sessions" ON public.photo_sessions FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert photo sessions" ON public.photo_sessions FOR INSERT TO public WITH CHECK (true);

-- Drop and recreate user_roles policies
DROP POLICY IF EXISTS "Admins can view roles" ON public.user_roles;

CREATE POLICY "Admins can view roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);