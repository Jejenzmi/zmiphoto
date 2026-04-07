
ALTER TABLE public.promo_materials
  ADD COLUMN schedule_start timestamptz DEFAULT NULL,
  ADD COLUMN schedule_end timestamptz DEFAULT NULL,
  ADD COLUMN display_mode text NOT NULL DEFAULT 'fullscreen'; -- fullscreen, split-left, split-right
