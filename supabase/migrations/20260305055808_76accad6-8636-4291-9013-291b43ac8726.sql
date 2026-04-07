-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Kiosks table
CREATE TABLE public.kiosks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kiosk_code TEXT NOT NULL UNIQUE,
  mac_address TEXT,
  location_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'warning')),
  last_ping TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.kiosks ENABLE ROW LEVEL SECURITY;

-- Pricing packages
CREATE TABLE public.pricing_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  grid_type TEXT NOT NULL,
  num_photos INTEGER NOT NULL DEFAULT 3,
  price INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.pricing_packages ENABLE ROW LEVEL SECURITY;

-- Templates
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  event_name TEXT,
  grid_type TEXT NOT NULL,
  asset_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Transactions
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kiosk_id UUID REFERENCES public.kiosks(id) ON DELETE SET NULL,
  package_id UUID REFERENCES public.pricing_packages(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method TEXT NOT NULL DEFAULT 'qris',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Photo sessions
CREATE TABLE public.photo_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  short_code TEXT NOT NULL UNIQUE,
  raw_image_urls TEXT[],
  final_image_url TEXT,
  gif_url TEXT,
  filter_applied TEXT DEFAULT 'Original',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.photo_sessions ENABLE ROW LEVEL SECURITY;

-- Admin role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'operator');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies

-- Kiosks: anyone can read, admins can manage
CREATE POLICY "Anyone can view kiosks" ON public.kiosks FOR SELECT USING (true);
CREATE POLICY "Admins can insert kiosks" ON public.kiosks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update kiosks" ON public.kiosks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete kiosks" ON public.kiosks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Pricing: anyone can read, admins manage
CREATE POLICY "Anyone can view pricing" ON public.pricing_packages FOR SELECT USING (true);
CREATE POLICY "Admins can insert pricing" ON public.pricing_packages FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update pricing" ON public.pricing_packages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete pricing" ON public.pricing_packages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Templates: anyone can read, admins manage
CREATE POLICY "Anyone can view templates" ON public.templates FOR SELECT USING (true);
CREATE POLICY "Admins can insert templates" ON public.templates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update templates" ON public.templates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete templates" ON public.templates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Transactions: admins can view, anyone can insert
CREATE POLICY "Admins can view transactions" ON public.transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can insert transactions" ON public.transactions FOR INSERT WITH CHECK (true);

-- Photo sessions: anyone can view and insert
CREATE POLICY "Anyone can view photo sessions" ON public.photo_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert photo sessions" ON public.photo_sessions FOR INSERT WITH CHECK (true);

-- User roles: only admins can view
CREATE POLICY "Admins can view roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_kiosks_updated_at BEFORE UPDATE ON public.kiosks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();