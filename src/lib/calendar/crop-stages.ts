// Static crop templates. Each template lists the ordered activities for a
// crop from sowing to harvest. Metadata (water requirement, fertilizer
// category, estimated duration) is stored on tasks so future AI features
// (yield prediction, irrigation planning) can consume it without another
// migration.

export type CropStageId =
  | "sowing"
  | "germination"
  | "vegetative"
  | "flowering"
  | "fruiting"
  | "harvest";

export type TaskTypeId =
  | "sowing"
  | "irrigation"
  | "fertilizer"
  | "spraying"
  | "weeding"
  | "inspection"
  | "harvest"
  | "other";

export type TemplateTask = {
  dayOffset: number;
  stage: CropStageId;
  stageId: string; // stable id like "rice.vegetative"
  taskName: string;
  taskType: TaskTypeId;
  priority: "low" | "normal" | "high";
  estimatedDurationDays?: number;
  waterRequirement?: "low" | "medium" | "high";
  fertilizerCategory?: "N" | "P" | "K" | "NPK" | "urea" | "dap" | "organic";
  notes?: string;
};

export type CropTemplate = {
  cropName: string; // canonical (matches CROP_SUGGESTIONS)
  aliases?: string[];
  cycleDays: number;
  stages: { id: CropStageId; startDay: number; label: string }[];
  tasks: TemplateTask[];
};

const RICE: CropTemplate = {
  cropName: "Rice",
  cycleDays: 120,
  stages: [
    { id: "sowing", startDay: 0, label: "Sowing" },
    { id: "germination", startDay: 3, label: "Germination" },
    { id: "vegetative", startDay: 15, label: "Vegetative" },
    { id: "flowering", startDay: 65, label: "Flowering" },
    { id: "fruiting", startDay: 85, label: "Grain filling" },
    { id: "harvest", startDay: 115, label: "Harvest" },
  ],
  tasks: [
    { dayOffset: 0, stage: "sowing", stageId: "rice.sowing", taskName: "Seed treatment & sowing", taskType: "sowing", priority: "high", waterRequirement: "medium" },
    { dayOffset: 3, stage: "germination", stageId: "rice.germination", taskName: "Light irrigation", taskType: "irrigation", priority: "high", waterRequirement: "medium" },
    { dayOffset: 12, stage: "vegetative", stageId: "rice.vegetative", taskName: "First fertilizer (Urea)", taskType: "fertilizer", priority: "high", fertilizerCategory: "urea" },
    { dayOffset: 20, stage: "vegetative", stageId: "rice.vegetative", taskName: "Weeding", taskType: "weeding", priority: "normal" },
    { dayOffset: 30, stage: "vegetative", stageId: "rice.vegetative", taskName: "Pest inspection", taskType: "inspection", priority: "normal" },
    { dayOffset: 45, stage: "vegetative", stageId: "rice.vegetative", taskName: "Second fertilizer (NPK)", taskType: "fertilizer", priority: "high", fertilizerCategory: "NPK" },
    { dayOffset: 60, stage: "flowering", stageId: "rice.flowering", taskName: "Panicle initiation check", taskType: "inspection", priority: "normal" },
    { dayOffset: 70, stage: "flowering", stageId: "rice.flowering", taskName: "Disease monitoring (blast/blight)", taskType: "inspection", priority: "high" },
    { dayOffset: 85, stage: "fruiting", stageId: "rice.fruiting", taskName: "Third fertilizer (K)", taskType: "fertilizer", priority: "normal", fertilizerCategory: "K" },
    { dayOffset: 100, stage: "fruiting", stageId: "rice.fruiting", taskName: "Grain filling irrigation", taskType: "irrigation", priority: "high", waterRequirement: "high" },
    { dayOffset: 115, stage: "harvest", stageId: "rice.harvest", taskName: "Harvest preparation", taskType: "other", priority: "high" },
    { dayOffset: 120, stage: "harvest", stageId: "rice.harvest", taskName: "Harvest", taskType: "harvest", priority: "high" },
  ],
};

const WHEAT: CropTemplate = {
  cropName: "Wheat",
  cycleDays: 130,
  stages: [
    { id: "sowing", startDay: 0, label: "Sowing" },
    { id: "germination", startDay: 5, label: "Germination" },
    { id: "vegetative", startDay: 20, label: "Tillering" },
    { id: "flowering", startDay: 70, label: "Flowering" },
    { id: "fruiting", startDay: 90, label: "Grain filling" },
    { id: "harvest", startDay: 125, label: "Harvest" },
  ],
  tasks: [
    { dayOffset: 0, stage: "sowing", stageId: "wheat.sowing", taskName: "Seed treatment & sowing", taskType: "sowing", priority: "high" },
    { dayOffset: 21, stage: "vegetative", stageId: "wheat.vegetative", taskName: "First irrigation (CRI)", taskType: "irrigation", priority: "high", waterRequirement: "high" },
    { dayOffset: 25, stage: "vegetative", stageId: "wheat.vegetative", taskName: "First urea top-dressing", taskType: "fertilizer", priority: "high", fertilizerCategory: "urea" },
    { dayOffset: 40, stage: "vegetative", stageId: "wheat.vegetative", taskName: "Weeding", taskType: "weeding", priority: "normal" },
    { dayOffset: 50, stage: "vegetative", stageId: "wheat.vegetative", taskName: "Second irrigation", taskType: "irrigation", priority: "high", waterRequirement: "medium" },
    { dayOffset: 65, stage: "flowering", stageId: "wheat.flowering", taskName: "Flowering irrigation", taskType: "irrigation", priority: "high", waterRequirement: "high" },
    { dayOffset: 90, stage: "fruiting", stageId: "wheat.fruiting", taskName: "Grain filling irrigation", taskType: "irrigation", priority: "high" },
    { dayOffset: 125, stage: "harvest", stageId: "wheat.harvest", taskName: "Harvest", taskType: "harvest", priority: "high" },
  ],
};

const TOMATO: CropTemplate = {
  cropName: "Tomato",
  cycleDays: 100,
  stages: [
    { id: "sowing", startDay: 0, label: "Transplant" },
    { id: "vegetative", startDay: 10, label: "Vegetative" },
    { id: "flowering", startDay: 35, label: "Flowering" },
    { id: "fruiting", startDay: 55, label: "Fruiting" },
    { id: "harvest", startDay: 75, label: "Harvest" },
  ],
  tasks: [
    { dayOffset: 0, stage: "sowing", stageId: "tomato.sowing", taskName: "Transplant seedlings", taskType: "sowing", priority: "high" },
    { dayOffset: 3, stage: "vegetative", stageId: "tomato.vegetative", taskName: "Establishment irrigation", taskType: "irrigation", priority: "high", waterRequirement: "medium" },
    { dayOffset: 15, stage: "vegetative", stageId: "tomato.vegetative", taskName: "First fertilizer (NPK)", taskType: "fertilizer", priority: "high", fertilizerCategory: "NPK" },
    { dayOffset: 25, stage: "vegetative", stageId: "tomato.vegetative", taskName: "Staking / pruning", taskType: "other", priority: "normal" },
    { dayOffset: 30, stage: "vegetative", stageId: "tomato.vegetative", taskName: "Preventive spraying", taskType: "spraying", priority: "normal" },
    { dayOffset: 40, stage: "flowering", stageId: "tomato.flowering", taskName: "Second fertilizer", taskType: "fertilizer", priority: "high", fertilizerCategory: "NPK" },
    { dayOffset: 50, stage: "flowering", stageId: "tomato.flowering", taskName: "Disease inspection", taskType: "inspection", priority: "high" },
    { dayOffset: 65, stage: "fruiting", stageId: "tomato.fruiting", taskName: "Potassium application", taskType: "fertilizer", priority: "normal", fertilizerCategory: "K" },
    { dayOffset: 75, stage: "harvest", stageId: "tomato.harvest", taskName: "First harvest", taskType: "harvest", priority: "high" },
    { dayOffset: 90, stage: "harvest", stageId: "tomato.harvest", taskName: "Continued harvest", taskType: "harvest", priority: "normal" },
  ],
};

const COTTON: CropTemplate = {
  cropName: "Cotton",
  cycleDays: 180,
  stages: [
    { id: "sowing", startDay: 0, label: "Sowing" },
    { id: "vegetative", startDay: 20, label: "Vegetative" },
    { id: "flowering", startDay: 60, label: "Flowering / squaring" },
    { id: "fruiting", startDay: 90, label: "Boll development" },
    { id: "harvest", startDay: 150, label: "Harvest" },
  ],
  tasks: [
    { dayOffset: 0, stage: "sowing", stageId: "cotton.sowing", taskName: "Seed treatment & sowing", taskType: "sowing", priority: "high" },
    { dayOffset: 20, stage: "vegetative", stageId: "cotton.vegetative", taskName: "First fertilizer (DAP)", taskType: "fertilizer", priority: "high", fertilizerCategory: "dap" },
    { dayOffset: 30, stage: "vegetative", stageId: "cotton.vegetative", taskName: "Weeding", taskType: "weeding", priority: "normal" },
    { dayOffset: 45, stage: "vegetative", stageId: "cotton.vegetative", taskName: "Pest scouting", taskType: "inspection", priority: "high" },
    { dayOffset: 60, stage: "flowering", stageId: "cotton.flowering", taskName: "Second fertilizer (Urea)", taskType: "fertilizer", priority: "high", fertilizerCategory: "urea" },
    { dayOffset: 90, stage: "fruiting", stageId: "cotton.fruiting", taskName: "Boll formation inspection", taskType: "inspection", priority: "high" },
    { dayOffset: 120, stage: "fruiting", stageId: "cotton.fruiting", taskName: "Third fertilizer (K)", taskType: "fertilizer", priority: "normal", fertilizerCategory: "K" },
    { dayOffset: 150, stage: "harvest", stageId: "cotton.harvest", taskName: "First picking", taskType: "harvest", priority: "high" },
    { dayOffset: 170, stage: "harvest", stageId: "cotton.harvest", taskName: "Second picking", taskType: "harvest", priority: "normal" },
  ],
};

const MAIZE: CropTemplate = {
  cropName: "Maize",
  cycleDays: 100,
  stages: [
    { id: "sowing", startDay: 0, label: "Sowing" },
    { id: "vegetative", startDay: 15, label: "Vegetative" },
    { id: "flowering", startDay: 55, label: "Tasseling / silking" },
    { id: "fruiting", startDay: 70, label: "Grain filling" },
    { id: "harvest", startDay: 95, label: "Harvest" },
  ],
  tasks: [
    { dayOffset: 0, stage: "sowing", stageId: "maize.sowing", taskName: "Seed treatment & sowing", taskType: "sowing", priority: "high" },
    { dayOffset: 15, stage: "vegetative", stageId: "maize.vegetative", taskName: "First fertilizer (NPK)", taskType: "fertilizer", priority: "high", fertilizerCategory: "NPK" },
    { dayOffset: 25, stage: "vegetative", stageId: "maize.vegetative", taskName: "Weeding", taskType: "weeding", priority: "normal" },
    { dayOffset: 35, stage: "vegetative", stageId: "maize.vegetative", taskName: "Second fertilizer (Urea)", taskType: "fertilizer", priority: "high", fertilizerCategory: "urea" },
    { dayOffset: 55, stage: "flowering", stageId: "maize.flowering", taskName: "Silking irrigation", taskType: "irrigation", priority: "high", waterRequirement: "high" },
    { dayOffset: 95, stage: "harvest", stageId: "maize.harvest", taskName: "Harvest", taskType: "harvest", priority: "high" },
  ],
};

const SUGARCANE: CropTemplate = {
  cropName: "Sugarcane",
  cycleDays: 360,
  stages: [
    { id: "sowing", startDay: 0, label: "Planting" },
    { id: "germination", startDay: 15, label: "Germination" },
    { id: "vegetative", startDay: 60, label: "Tillering" },
    { id: "fruiting", startDay: 180, label: "Grand growth" },
    { id: "harvest", startDay: 330, label: "Maturity" },
  ],
  tasks: [
    { dayOffset: 0, stage: "sowing", stageId: "sugarcane.sowing", taskName: "Sett planting", taskType: "sowing", priority: "high" },
    { dayOffset: 30, stage: "vegetative", stageId: "sugarcane.vegetative", taskName: "First fertilizer (NPK)", taskType: "fertilizer", priority: "high", fertilizerCategory: "NPK" },
    { dayOffset: 60, stage: "vegetative", stageId: "sugarcane.vegetative", taskName: "Earthing up", taskType: "other", priority: "normal" },
    { dayOffset: 120, stage: "vegetative", stageId: "sugarcane.vegetative", taskName: "Second fertilizer (Urea)", taskType: "fertilizer", priority: "high", fertilizerCategory: "urea" },
    { dayOffset: 180, stage: "fruiting", stageId: "sugarcane.fruiting", taskName: "Pest scouting", taskType: "inspection", priority: "normal" },
    { dayOffset: 330, stage: "harvest", stageId: "sugarcane.harvest", taskName: "Harvest", taskType: "harvest", priority: "high" },
  ],
};

const GROUNDNUT: CropTemplate = {
  cropName: "Groundnut",
  cycleDays: 110,
  stages: [
    { id: "sowing", startDay: 0, label: "Sowing" },
    { id: "vegetative", startDay: 15, label: "Vegetative" },
    { id: "flowering", startDay: 30, label: "Flowering" },
    { id: "fruiting", startDay: 55, label: "Pegging / pod formation" },
    { id: "harvest", startDay: 100, label: "Harvest" },
  ],
  tasks: [
    { dayOffset: 0, stage: "sowing", stageId: "groundnut.sowing", taskName: "Sowing", taskType: "sowing", priority: "high" },
    { dayOffset: 15, stage: "vegetative", stageId: "groundnut.vegetative", taskName: "Weeding", taskType: "weeding", priority: "normal" },
    { dayOffset: 25, stage: "vegetative", stageId: "groundnut.vegetative", taskName: "Gypsum application", taskType: "fertilizer", priority: "high", fertilizerCategory: "organic" },
    { dayOffset: 50, stage: "flowering", stageId: "groundnut.flowering", taskName: "Preventive spraying", taskType: "spraying", priority: "normal" },
    { dayOffset: 105, stage: "harvest", stageId: "groundnut.harvest", taskName: "Harvest", taskType: "harvest", priority: "high" },
  ],
};

const CHILLI: CropTemplate = {
  cropName: "Chilli",
  cycleDays: 150,
  stages: [
    { id: "sowing", startDay: 0, label: "Transplant" },
    { id: "vegetative", startDay: 10, label: "Vegetative" },
    { id: "flowering", startDay: 45, label: "Flowering" },
    { id: "fruiting", startDay: 70, label: "Fruit set" },
    { id: "harvest", startDay: 100, label: "Harvest" },
  ],
  tasks: [
    { dayOffset: 0, stage: "sowing", stageId: "chilli.sowing", taskName: "Transplant seedlings", taskType: "sowing", priority: "high" },
    { dayOffset: 15, stage: "vegetative", stageId: "chilli.vegetative", taskName: "First fertilizer (NPK)", taskType: "fertilizer", priority: "high", fertilizerCategory: "NPK" },
    { dayOffset: 30, stage: "vegetative", stageId: "chilli.vegetative", taskName: "Preventive spraying (thrips/mites)", taskType: "spraying", priority: "high" },
    { dayOffset: 60, stage: "flowering", stageId: "chilli.flowering", taskName: "Second fertilizer", taskType: "fertilizer", priority: "high", fertilizerCategory: "NPK" },
    { dayOffset: 100, stage: "harvest", stageId: "chilli.harvest", taskName: "First harvest", taskType: "harvest", priority: "high" },
    { dayOffset: 130, stage: "harvest", stageId: "chilli.harvest", taskName: "Continued harvest", taskType: "harvest", priority: "normal" },
  ],
};

// Generic fallback for unknown crops
const GENERIC: CropTemplate = {
  cropName: "Generic",
  cycleDays: 120,
  stages: [
    { id: "sowing", startDay: 0, label: "Sowing" },
    { id: "vegetative", startDay: 15, label: "Vegetative" },
    { id: "flowering", startDay: 55, label: "Flowering" },
    { id: "fruiting", startDay: 80, label: "Fruiting" },
    { id: "harvest", startDay: 110, label: "Harvest" },
  ],
  tasks: [
    { dayOffset: 0, stage: "sowing", stageId: "generic.sowing", taskName: "Sowing", taskType: "sowing", priority: "high" },
    { dayOffset: 3, stage: "sowing", stageId: "generic.sowing", taskName: "Initial irrigation", taskType: "irrigation", priority: "high" },
    { dayOffset: 15, stage: "vegetative", stageId: "generic.vegetative", taskName: "First fertilizer", taskType: "fertilizer", priority: "high", fertilizerCategory: "NPK" },
    { dayOffset: 25, stage: "vegetative", stageId: "generic.vegetative", taskName: "Weeding", taskType: "weeding", priority: "normal" },
    { dayOffset: 40, stage: "vegetative", stageId: "generic.vegetative", taskName: "Pest inspection", taskType: "inspection", priority: "normal" },
    { dayOffset: 55, stage: "flowering", stageId: "generic.flowering", taskName: "Second fertilizer", taskType: "fertilizer", priority: "high", fertilizerCategory: "NPK" },
    { dayOffset: 80, stage: "fruiting", stageId: "generic.fruiting", taskName: "Disease inspection", taskType: "inspection", priority: "normal" },
    { dayOffset: 110, stage: "harvest", stageId: "generic.harvest", taskName: "Harvest", taskType: "harvest", priority: "high" },
  ],
};

export const CROP_TEMPLATES: CropTemplate[] = [
  RICE,
  WHEAT,
  TOMATO,
  COTTON,
  MAIZE,
  SUGARCANE,
  GROUNDNUT,
  CHILLI,
];

export function findCropTemplate(cropName: string | null | undefined): CropTemplate {
  if (!cropName) return GENERIC;
  const norm = cropName.trim().toLowerCase();
  for (const t of CROP_TEMPLATES) {
    if (t.cropName.toLowerCase() === norm) return t;
    if (t.aliases?.some((a) => a.toLowerCase() === norm)) return t;
  }
  return GENERIC;
}

export function stageForDay(template: CropTemplate, dayOffset: number): { id: string; label: string } {
  let current = template.stages[0];
  for (const s of template.stages) if (dayOffset >= s.startDay) current = s;
  return { id: current.id, label: current.label };
}
