import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Farm = Tables<"farms">;
export type FarmWaterSource = Tables<"farm_water_sources">;
export type FarmImage = Tables<"farm_images">;

export type FarmWithRelations = Farm & {
  farm_water_sources: FarmWaterSource[];
  farm_images: FarmImage[];
};

export const FARM_TYPES = [
  "Agricultural Land",
  "Orchard",
  "Vegetable Farm",
  "Greenhouse",
  "Plantation",
] as const;

export const SOIL_TYPES = [
  "Black Soil",
  "Red Soil",
  "Sandy Soil",
  "Clay Soil",
  "Loamy Soil",
  "Unknown",
] as const;

export const IRRIGATION_METHODS = ["Drip", "Flood", "Sprinkler", "Rain-fed", "Manual"] as const;

export const AREA_UNITS = ["acres", "hectares", "sqm"] as const;

export const WATER_SOURCES = [
  "Borewell",
  "Canal",
  "River",
  "Lake",
  "Rainwater",
  "Drip Irrigation",
  "Sprinkler",
  "Other",
] as const;

export const CROP_SUGGESTIONS = [
  "Rice",
  "Cotton",
  "Maize",
  "Tomato",
  "Groundnut",
  "Chilli",
  "Wheat",
  "Sugarcane",
  "Empty Field",
];

export const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu and Kashmir","Ladakh","Puducherry","Chandigarh",
];

export const BUCKET = "farm-images";

export async function listFarms(): Promise<FarmWithRelations[]> {
  const { data, error } = await supabase
    .from("farms")
    .select("*, farm_water_sources(*), farm_images(*)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as FarmWithRelations[]) ?? [];
}

export async function getFarm(id: string): Promise<FarmWithRelations | null> {
  const { data, error } = await supabase
    .from("farms")
    .select("*, farm_water_sources(*), farm_images(*)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data as FarmWithRelations | null;
}

export type FarmFormValues = Omit<
  TablesInsert<"farms">,
  "id" | "user_id" | "created_at" | "updated_at" | "deleted_at"
> & {
  water_sources: string[];
  new_images?: File[];
};

export async function createFarm(values: FarmFormValues) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) throw new Error("Not signed in");

  const { water_sources, new_images, ...farm } = values;
  const { data: inserted, error } = await supabase
    .from("farms")
    .insert({ ...farm, user_id: uid })
    .select()
    .single();
  if (error) throw error;

  if (water_sources.length) {
    const rows = water_sources.map((w) => ({ farm_id: inserted.id, water_source: w }));
    const { error: wErr } = await supabase.from("farm_water_sources").insert(rows);
    if (wErr) throw wErr;
  }
  if (new_images?.length) await uploadFarmImages(inserted.id, new_images);
  return inserted;
}

export async function updateFarm(id: string, values: FarmFormValues) {
  const { water_sources, new_images, ...farm } = values;
  const { error } = await supabase.from("farms").update(farm).eq("id", id);
  if (error) throw error;

  await supabase.from("farm_water_sources").delete().eq("farm_id", id);
  if (water_sources.length) {
    const rows = water_sources.map((w) => ({ farm_id: id, water_source: w }));
    const { error: wErr } = await supabase.from("farm_water_sources").insert(rows);
    if (wErr) throw wErr;
  }
  if (new_images?.length) await uploadFarmImages(id, new_images);
}

export async function softDeleteFarm(id: string) {
  const { error } = await supabase
    .from("farms")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function uploadFarmImages(
  farmId: string,
  files: File[],
  imageType: "farm" | "soil" = "farm",
) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) throw new Error("Not signed in");

  for (const file of files) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${uid}/${farmId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) throw upErr;
    const { error: insErr } = await supabase
      .from("farm_images")
      .insert({ farm_id: farmId, image_url: path, image_type: imageType });
    if (insErr) throw insErr;
  }
}

export async function deleteFarmImage(image: FarmImage) {
  await supabase.storage.from(BUCKET).remove([image.image_url]);
  await supabase.from("farm_images").delete().eq("id", image.id);
}

export async function signImage(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function signImages(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
  const out: Record<string, string> = {};
  data?.forEach((d) => {
    if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  });
  return out;
}

export function formatArea(area: number | string | null, unit: string | null): string {
  if (area == null) return "—";
  const n = typeof area === "string" ? parseFloat(area) : area;
  const u = unit === "sqm" ? "m²" : unit === "hectares" ? "ha" : "ac";
  return `${n} ${u}`;
}
