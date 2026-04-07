
ALTER TABLE public.photo_sessions
ADD COLUMN IF NOT EXISTS boomerang_url text,
ADD COLUMN IF NOT EXISTS live_photo_url text,
ADD COLUMN IF NOT EXISTS ai_angles_urls jsonb DEFAULT '[]'::jsonb;
