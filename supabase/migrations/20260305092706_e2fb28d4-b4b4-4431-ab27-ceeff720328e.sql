
-- Loyalty members table
CREATE TABLE public.loyalty_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Loyalty transactions log
CREATE TABLE public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.loyalty_members(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'earn',
  description TEXT,
  session_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Public read/write for kiosk usage (no auth required)
CREATE POLICY "Anyone can view loyalty members" ON public.loyalty_members FOR SELECT USING (true);
CREATE POLICY "Anyone can insert loyalty members" ON public.loyalty_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update loyalty members" ON public.loyalty_members FOR UPDATE USING (true);

CREATE POLICY "Anyone can view loyalty transactions" ON public.loyalty_transactions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert loyalty transactions" ON public.loyalty_transactions FOR INSERT WITH CHECK (true);
