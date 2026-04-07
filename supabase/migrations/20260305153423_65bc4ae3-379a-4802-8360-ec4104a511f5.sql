
-- Venues table for resto, cafe, hotel, wisata
CREATE TABLE public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'resto',
  address TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- Link kiosks to venues
ALTER TABLE public.kiosks ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id);

-- Link user_roles to venues (for venue/partner users)
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id);

-- Photo sessions link to venue
ALTER TABLE public.photo_sessions ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id);

-- RLS for venues
CREATE POLICY "Admins can manage venues" ON public.venues FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Venue users can view own venue" ON public.venues FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND venue_id = venues.id)
);

-- Trigger for updated_at
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Security definer function to check venue access
CREATE OR REPLACE FUNCTION public.has_venue_access(_user_id uuid, _venue_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND venue_id = _venue_id
  )
$$;
