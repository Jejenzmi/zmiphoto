
ALTER TABLE public.revenue_splits 
  ADD COLUMN IF NOT EXISTS ppn_mode text NOT NULL DEFAULT 'exclude',
  ADD COLUMN IF NOT EXISTS cooperation_type text NOT NULL DEFAULT 'revenue_share';

-- ppn_mode: 'exclude' (exclude PPN, split dari revenue sebelum PPN) or 'include' (include PPN, split dari revenue termasuk PPN)
-- cooperation_type: 'revenue_share', 'sewa_bulanan', 'bagi_hasil', 'franchise'
