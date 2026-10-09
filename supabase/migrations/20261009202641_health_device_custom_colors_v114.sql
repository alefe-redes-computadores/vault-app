-- Allow validated custom colors without changing ownership or relationships.
ALTER TABLE public.health_devices DROP CONSTRAINT IF EXISTS health_devices_color_check;
ALTER TABLE public.health_devices ADD CONSTRAINT health_devices_color_check CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
