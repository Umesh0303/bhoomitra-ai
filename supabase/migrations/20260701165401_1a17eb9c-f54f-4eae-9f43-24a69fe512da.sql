
-- FARMS
CREATE TABLE public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_name TEXT NOT NULL,
  farm_type TEXT,
  description TEXT,
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  village TEXT NOT NULL,
  pincode TEXT,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  total_area NUMERIC NOT NULL,
  area_unit TEXT NOT NULL DEFAULT 'acres',
  soil_type TEXT,
  irrigation_method TEXT,
  current_crop TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farms TO authenticated;
GRANT ALL ON public.farms TO service_role;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view own farms" ON public.farms FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners can insert own farms" ON public.farms FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update own farms" ON public.farms FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can delete own farms" ON public.farms FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX farms_user_id_idx ON public.farms(user_id) WHERE deleted_at IS NULL;

CREATE TRIGGER update_farms_updated_at BEFORE UPDATE ON public.farms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FARM WATER SOURCES
CREATE TABLE public.farm_water_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  water_source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farm_water_sources TO authenticated;
GRANT ALL ON public.farm_water_sources TO service_role;
ALTER TABLE public.farm_water_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view own water sources" ON public.farm_water_sources FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND f.user_id = auth.uid()));
CREATE POLICY "Owners can insert own water sources" ON public.farm_water_sources FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND f.user_id = auth.uid()));
CREATE POLICY "Owners can update own water sources" ON public.farm_water_sources FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND f.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND f.user_id = auth.uid()));
CREATE POLICY "Owners can delete own water sources" ON public.farm_water_sources FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND f.user_id = auth.uid()));
CREATE INDEX farm_water_sources_farm_id_idx ON public.farm_water_sources(farm_id);

-- FARM IMAGES
CREATE TABLE public.farm_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type TEXT NOT NULL DEFAULT 'farm',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farm_images TO authenticated;
GRANT ALL ON public.farm_images TO service_role;
ALTER TABLE public.farm_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view own farm images" ON public.farm_images FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND f.user_id = auth.uid()));
CREATE POLICY "Owners can insert own farm images" ON public.farm_images FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND f.user_id = auth.uid()));
CREATE POLICY "Owners can update own farm images" ON public.farm_images FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND f.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND f.user_id = auth.uid()));
CREATE POLICY "Owners can delete own farm images" ON public.farm_images FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND f.user_id = auth.uid()));
CREATE INDEX farm_images_farm_id_idx ON public.farm_images(farm_id);

-- STORAGE POLICIES for 'farm-images' bucket (bucket created via storage tool)
CREATE POLICY "Users can view own farm images in storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'farm-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload own farm images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'farm-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own farm images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'farm-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own farm images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'farm-images' AND auth.uid()::text = (storage.foldername(name))[1]);
