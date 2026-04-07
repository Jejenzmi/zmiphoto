CREATE TABLE public.vouchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percentage', 'free')),
  discount_value INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vouchers" ON public.vouchers FOR SELECT USING (true);

CREATE POLICY "Admins can manage vouchers" ON public.vouchers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Superadmin can manage vouchers" ON public.vouchers FOR ALL TO authenticated USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Anyone can redeem vouchers" ON public.vouchers FOR UPDATE USING (true) WITH CHECK (true);

CREATE TRIGGER update_vouchers_updated_at BEFORE UPDATE ON public.vouchers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();