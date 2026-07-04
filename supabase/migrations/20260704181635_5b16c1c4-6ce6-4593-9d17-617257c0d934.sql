ALTER TABLE public.farms
  ADD COLUMN IF NOT EXISTS formatted_address text,
  ADD COLUMN IF NOT EXISTS country          text,
  ADD COLUMN IF NOT EXISTS google_place_id  text,
  ADD COLUMN IF NOT EXISTS map_zoom         integer DEFAULT 16;