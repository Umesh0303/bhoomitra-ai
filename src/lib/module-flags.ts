// Per-module launch flags so the dashboard can open modules individually
// without a redesign. Flip `enabled` to true when a module ships.

export type ModuleKey =
  | "crop-recommendation"
  | "disease-detection"
  | "fertilizer-advisor"
  | "yield-prediction"
  | "market-prediction"
  | "voice-assistant";

export type ModuleFlag = {
  key: ModuleKey;
  enabled: boolean;
  to?: string;
};

export const MODULE_FLAGS: Record<ModuleKey, ModuleFlag> = {
  "crop-recommendation": { key: "crop-recommendation", enabled: false },
  "disease-detection": {
    key: "disease-detection",
    enabled: true,
    to: "/app/crop-health",
  },
  "fertilizer-advisor": { key: "fertilizer-advisor", enabled: false },
  "yield-prediction": { key: "yield-prediction", enabled: false },
  "market-prediction": { key: "market-prediction", enabled: false },
  "voice-assistant": { key: "voice-assistant", enabled: true, to: "/app/assistant" },
};

export function moduleFlag(key: ModuleKey): ModuleFlag {
  return MODULE_FLAGS[key];
}
