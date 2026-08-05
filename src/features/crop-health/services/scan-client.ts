// Browser-side data access for crop scans: image upload to the private
// `crop-scans` bucket, signed URLs, and history reads. RLS scopes everything
// to the signed-in farmer.

import { supabase } from "@/integrations/supabase/client";
import type {
  CropScanImageRow,
  CropScanQuestionRow,
  CropScanRow,
  PlantPart,
} from "../types";
import type { CompressedImage } from "./image-compress";

export const SCAN_BUCKET = "crop-scans";
export const MAX_IMAGES = 5;

export type ScanWithMedia = CropScanRow & {
  crop_scan_images: CropScanImageRow[];
  crop_scan_questions: CropScanQuestionRow[];
};

export async function listScanHistory(farmId?: string | null): Promise<ScanWithMedia[]> {
  let q = supabase
    .from("crop_scans")
    .select("*, crop_scan_images(*), crop_scan_questions(*)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (farmId) q = q.eq("farm_id", farmId);
  const { data, error } = await q;
  if (error) throw error;
  return (data as ScanWithMedia[]) ?? [];
}

export async function getScanWithMedia(id: string): Promise<ScanWithMedia | null> {
  const { data, error } = await supabase
    .from("crop_scans")
    .select("*, crop_scan_images(*), crop_scan_questions(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as ScanWithMedia | null) ?? null;
}

export async function deleteScan(id: string) {
  const { data: images } = await supabase
    .from("crop_scan_images")
    .select("storage_path")
    .eq("scan_id", id);
  const paths = (images ?? []).map((i) => i.storage_path);
  if (paths.length) await supabase.storage.from(SCAN_BUCKET).remove(paths);
  const { error } = await supabase.from("crop_scans").delete().eq("id", id);
  if (error) throw error;
}

export async function signScanImage(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(SCAN_BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function signScanImages(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await supabase.storage.from(SCAN_BUCKET).createSignedUrls(paths, 60 * 60);
  const out: Record<string, string> = {};
  data?.forEach((d) => {
    if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  });
  return out;
}

export type PendingImage = CompressedImage & { plantPart: PlantPart; id: string };

/** Uploads compressed images and records them against the scan. */
export async function uploadScanImages(
  scanId: string,
  images: PendingImage[],
  onProgress?: (done: number, total: number) => void,
) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) throw new Error("Not signed in");

  let done = 0;
  for (const [index, img] of images.entries()) {
    const path = `${uid}/${scanId}/${crypto.randomUUID()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from(SCAN_BUCKET)
      .upload(path, img.file, { upsert: false, contentType: img.file.type || "image/jpeg" });
    if (upErr) throw upErr;

    const { error: insErr } = await supabase.from("crop_scan_images").insert({
      scan_id: scanId,
      user_id: uid,
      storage_path: path,
      plant_part: img.plantPart,
      media_kind: "image",
      width: img.width || null,
      height: img.height || null,
      bytes: img.bytes || null,
      sort_order: index,
    });
    if (insErr) throw insErr;

    done += 1;
    onProgress?.(done, images.length);
  }
}
