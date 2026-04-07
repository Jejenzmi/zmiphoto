-- Add camera configuration to kiosks
ALTER TABLE public.kiosks ADD COLUMN camera_config jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.kiosks ADD COLUMN notes text;

-- camera_config example: [{"position": "front", "model": "Canon 1300D", "enabled": true}, {"position": "side", "model": "Canon 1200D", "enabled": true}]