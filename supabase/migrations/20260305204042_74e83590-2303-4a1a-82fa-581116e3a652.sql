
CREATE TABLE public.revenue_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  role_name text NOT NULL,
  percentage numeric(5,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(venue_id, role_name)
);

ALTER TABLE public.revenue_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin can view all revenue splits"
  ON public.revenue_splits FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admin can manage revenue splits"
  ON public.revenue_splits FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Venue can view own revenue split"
  ON public.revenue_splits FOR SELECT
  USING (has_venue_access(auth.uid(), venue_id));

CREATE POLICY "Partner can view own revenue split"
  ON public.revenue_splits FOR SELECT
  USING (has_venue_access(auth.uid(), venue_id));

CREATE TRIGGER update_revenue_splits_updated_at
  BEFORE UPDATE ON public.revenue_splits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE POLICY "Superadmin can view all venues"
  ON public.venues FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmin can view all kiosks"
  ON public.kiosks FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmin can view all transactions"
  ON public.transactions FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmin can view all photo sessions"
  ON public.photo_sessions FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmin can view all templates"
  ON public.templates FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmin can view all promo materials"
  ON public.promo_materials FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'::app_role));
