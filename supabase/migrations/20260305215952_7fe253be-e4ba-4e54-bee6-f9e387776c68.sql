
CREATE TABLE public.loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🎁',
  points_cost integer NOT NULL DEFAULT 10,
  description text,
  reward_type text NOT NULL DEFAULT 'discount',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rewards" ON public.loyalty_rewards
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage rewards" ON public.loyalty_rewards
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Superadmin can manage rewards" ON public.loyalty_rewards
  FOR ALL USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Seed default rewards
INSERT INTO public.loyalty_rewards (name, emoji, points_cost, description, reward_type, sort_order) VALUES
  ('Free Print', '🖨️', 50, '1x cetak gratis', 'free_print', 1),
  ('Diskon 30%', '💰', 30, 'Potongan 30% sesi berikutnya', 'discount', 2),
  ('+1 Foto Extra', '📸', 20, 'Tambahan 1 jepretan', 'extra_photo', 3),
  ('Premium Filter', '✨', 15, 'Akses filter AI premium', 'premium_filter', 4);
