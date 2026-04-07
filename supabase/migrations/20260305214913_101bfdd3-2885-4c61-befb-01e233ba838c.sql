ALTER TABLE public.templates
  ADD COLUMN num_photos integer NOT NULL DEFAULT 3,
  ADD COLUMN orientation text NOT NULL DEFAULT 'portrait',
  ADD COLUMN canvas_width integer NOT NULL DEFAULT 600,
  ADD COLUMN canvas_height integer NOT NULL DEFAULT 1800,
  ADD COLUMN grid_cols integer NOT NULL DEFAULT 1,
  ADD COLUMN price integer NOT NULL DEFAULT 10000,
  ADD COLUMN description text NULL;