
-- Promo materials table for TV displays
CREATE TABLE public.promo_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kiosk_id uuid REFERENCES public.kiosks(id) ON DELETE CASCADE,
  title text NOT NULL,
  media_type text NOT NULL DEFAULT 'image', -- image, video, brochure
  media_url text NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 10,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- NULL kiosk_id = global promo (shown on all kiosks)
ALTER TABLE public.promo_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promos" ON public.promo_materials
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage promos" ON public.promo_materials
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for promo files
INSERT INTO storage.buckets (id, name, public) VALUES ('promo-materials', 'promo-materials', true);

CREATE POLICY "Anyone can view promo files" ON storage.objects
  FOR SELECT USING (bucket_id = 'promo-materials');

CREATE POLICY "Admins can upload promo files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'promo-materials' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete promo files" ON storage.objects
  FOR DELETE USING (bucket_id = 'promo-materials' AND has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_promo_materials_updated_at
  BEFORE UPDATE ON public.promo_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for display auto-refresh
ALTER PUBLICATION supabase_realtime ADD TABLE public.promo_materials;
