CREATE POLICY "crop_scans_read_own" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'crop-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "crop_scans_insert_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'crop-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "crop_scans_update_own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'crop-scans' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'crop-scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "crop_scans_delete_own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'crop-scans' AND auth.uid()::text = (storage.foldername(name))[1]);