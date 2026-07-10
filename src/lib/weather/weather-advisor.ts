// Rule-engine based weather advisor. Rules are declarative so we can migrate
// to an AI-driven advisor later without rewriting call sites.
//
// Inputs: normalized weather + optional crop stage + optional soil type.
// Outputs: score, risk meter, recommendations, next-best-action, alerts.

import type {
  FarmWeather,
  Recommendation,
  WeatherAdvice,
  WeatherAlert,
  WeatherRisk,
  WeatherScore,
  NextBestAction,
  WeatherDaily,
} from "./weather-types";

export type AdvisorContext = {
  weather: FarmWeather;
  cropName?: string | null;
  cropStage?: string | null; // sowing|germination|vegetative|flowering|fruiting|harvest
  soilType?: string | null;
};

type RuleCondition = (ctx: AdvisorContext) => boolean;
type RuleRecommendation = (ctx: AdvisorContext) => Omit<Recommendation, "id">;
type Rule = {
  id: string;
  when: RuleCondition;
  build: RuleRecommendation;
};

// ---------- Helpers ----------
const today = (w: FarmWeather): WeatherDaily | undefined => w.daily[0];
const tomorrow = (w: FarmWeather): WeatherDaily | undefined => w.daily[1];

function nextRainHours(w: FarmWeather): number | null {
  for (let i = 0; i < w.hourly.length; i++) {
    if (w.hourly[i].rainProbability >= 60 || w.hourly[i].precipMm >= 1) return i;
  }
  return null;
}

// ---------- Rule library ----------
const RULES: Rule[] = [
  // Rain
  {
    id: "heavy_rain_today",
    when: ({ weather }) => (today(weather)?.precipMm ?? 0) >= 15 || (today(weather)?.rainProbability ?? 0) >= 80,
    build: ({ weather, cropStage, soilType }) => {
      const actions = ["Delay fertilizer application", "Avoid pesticide spraying", "Reduce or skip irrigation"];
      if (cropStage === "flowering") actions.push("Monitor for fungal disease risk");
      if (cropStage === "harvest") actions.unshift("Harvest immediately if crop is ready");
      if (soilType === "Black Soil") actions.push("Delay any field entry for 3 days — soil will stay saturated");
      if (soilType === "Red Soil") actions.push("Inspect drainage tomorrow morning");
      return {
        title: "Heavy rain expected today",
        actions,
        reason: `Rain probability ${today(weather)?.rainProbability}% with ${today(weather)?.precipMm.toFixed(1)}mm precipitation.`,
        severity: "high",
        category: "rain",
        cropStage: cropStage ?? undefined,
      };
    },
  },
  {
    id: "heavy_rain_tomorrow",
    when: ({ weather }) => (tomorrow(weather)?.precipMm ?? 0) >= 15 || (tomorrow(weather)?.rainProbability ?? 0) >= 80,
    build: ({ weather, cropStage }) => ({
      title: "Heavy rain expected tomorrow",
      actions: [
        "Complete fertilizer application today before 4 PM",
        "Postpone any spraying operations",
        cropStage === "harvest" ? "Consider harvesting today if crop is mature" : "Secure irrigation pipes and covers",
      ],
      reason: `Tomorrow: ${tomorrow(weather)?.rainProbability}% rain probability.`,
      severity: "medium",
      category: "rain",
      cropStage: cropStage ?? undefined,
    }),
  },
  // Wind
  {
    id: "high_wind",
    when: ({ weather }) => weather.current.windKph >= 30 || (today(weather)?.windKph ?? 0) >= 30,
    build: ({ weather, cropStage }) => ({
      title: "Strong winds today",
      actions: [
        "Delay pesticide and foliar spraying — spray will drift",
        cropStage === "flowering" || cropStage === "fruiting" ? "Protect flowering/fruiting crops with windbreaks" : "Protect young seedlings",
        "Secure irrigation pipes and shade covers",
      ],
      reason: `Wind at ${weather.current.windKph.toFixed(0)} km/h.`,
      severity: weather.current.windKph >= 45 ? "high" : "medium",
      category: "wind",
      cropStage: cropStage ?? undefined,
    }),
  },
  // Heat
  {
    id: "heat_stress",
    when: ({ weather }) => (today(weather)?.tempMaxC ?? 0) >= 36,
    build: ({ weather, cropStage }) => ({
      title: "Heat stress warning",
      actions: [
        "Increase irrigation frequency",
        "Water during early morning or evening — avoid midday",
        "Avoid fertilizer application at noon",
        cropStage === "germination" ? "Provide shade for young seedlings" : "Apply mulch to conserve soil moisture",
      ],
      reason: `High of ${today(weather)?.tempMaxC.toFixed(0)}°C today.`,
      severity: (today(weather)?.tempMaxC ?? 0) >= 40 ? "high" : "medium",
      category: "heat",
      cropStage: cropStage ?? undefined,
    }),
  },
  // Cold / frost
  {
    id: "frost_risk",
    when: ({ weather }) => (today(weather)?.tempMinC ?? 99) <= 4,
    build: ({ weather, cropStage }) => ({
      title: "Frost risk overnight",
      actions: [
        cropStage === "sowing" || cropStage === "germination" ? "Delay sowing until temperatures rise" : "Protect seedlings with covers",
        "Irrigate before evening — moist soil retains heat",
        "Monitor for frost damage tomorrow morning",
      ],
      reason: `Overnight low of ${today(weather)?.tempMinC.toFixed(0)}°C.`,
      severity: "high",
      category: "frost",
      cropStage: cropStage ?? undefined,
    }),
  },
  // Dry
  {
    id: "dry_spell",
    when: ({ weather }) => {
      const total = weather.daily.slice(0, 5).reduce((s, d) => s + (d.precipMm || 0), 0);
      return total < 2 && (today(weather)?.tempMaxC ?? 0) >= 30;
    },
    build: ({ weather, soilType }) => ({
      title: "Dry spell ahead",
      actions: [
        "Increase watering frequency",
        soilType === "Sandy Soil" ? "Water twice daily — sandy soil drains fast" : "Apply mulch to retain soil moisture",
        "Monitor soil moisture daily",
      ],
      reason: `Less than 2mm rain expected over next 5 days, highs ${today(weather)?.tempMaxC.toFixed(0)}°C.`,
      severity: "medium",
      category: "irrigation",
    }),
  },
  // Good spraying window
  {
    id: "good_spraying_window",
    when: ({ weather }) => {
      const w = weather.current.windKph < 12;
      const noRain = (today(weather)?.rainProbability ?? 0) < 30;
      const mildTemp = weather.current.tempC >= 18 && weather.current.tempC <= 32;
      return w && noRain && mildTemp;
    },
    build: () => ({
      title: "Good window for spraying",
      actions: ["Ideal conditions for pesticide or foliar spraying", "Best time: early morning or late afternoon"],
      reason: "Low wind, low rain probability, mild temperature.",
      severity: "low",
      category: "spraying",
    }),
  },
  // Fertilizer
  {
    id: "fertilizer_window",
    when: ({ weather }) => {
      const noRainSoon = nextRainHours(weather);
      return noRainSoon === null || noRainSoon >= 24;
    },
    build: ({ weather }) => ({
      title: "Good window for fertilizer application",
      actions: ["Apply fertilizer before 11 AM for best absorption", "No significant rainfall expected in next 24h"],
      reason: `Next likely rain: ${nextRainHours(weather) === null ? "not in forecast" : `in ${nextRainHours(weather)}h`}.`,
      severity: "low",
      category: "fertilizer",
    }),
  },
  // Crop-stage flowering + rain
  {
    id: "flowering_disease_risk",
    when: ({ weather, cropStage }) => cropStage === "flowering" && (today(weather)?.humidity ?? 0) >= 80,
    build: () => ({
      title: "High disease risk at flowering",
      actions: ["Inspect for fungal disease (blast, blight)", "Prepare preventive fungicide", "Improve air circulation if possible"],
      reason: "High humidity at flowering stage.",
      severity: "high",
      category: "disease",
      cropStage: "flowering",
    }),
  },
  // Harvest window
  {
    id: "harvest_urgency",
    when: ({ weather, cropStage }) => {
      if (cropStage !== "harvest") return false;
      const rain3 = weather.daily.slice(0, 3).some((d) => (d.rainProbability ?? 0) >= 70);
      return rain3;
    },
    build: () => ({
      title: "Harvest soon — rain expected within 3 days",
      actions: ["Advance harvest schedule", "Arrange labour and storage today"],
      reason: "Rain forecast in next 3 days may damage mature crop.",
      severity: "high",
      category: "harvest",
      cropStage: "harvest",
    }),
  },
];

// ---------- Score ----------
function computeScore(ctx: AdvisorContext, recs: Recommendation[]): WeatherScore {
  let score = 100;
  const goodFor: string[] = [];
  const avoid: string[] = [];

  for (const r of recs) {
    if (r.severity === "high") score -= 20;
    else if (r.severity === "medium") score -= 10;
    else score -= 2;

    if (r.category === "spraying" && r.severity === "low") goodFor.push("Spraying");
    if (r.category === "fertilizer" && r.severity === "low") goodFor.push("Fertilizer");
    if (r.severity !== "low") {
      const label = {
        rain: "Spraying",
        wind: "Spraying",
        heat: "Fertilizer application",
        cold: "Sowing",
        frost: "Sowing",
        harvest: "Delaying harvest",
        disease: "Overhead irrigation",
        irrigation: "",
        fertilizer: "Fertilizer application",
        spraying: "Spraying",
        general: "",
      }[r.category];
      if (label && !avoid.includes(label)) avoid.push(label);
    }
  }

  // Basic positives from conditions
  const w = ctx.weather.current;
  if (w.tempC >= 20 && w.tempC <= 30 && w.rainProbability < 30 && w.windKph < 15) {
    if (!goodFor.includes("Weeding")) goodFor.push("Weeding");
    if (!goodFor.includes("Field inspection")) goodFor.push("Field inspection");
  }
  if (w.rainProbability >= 60) {
    if (!goodFor.includes("Skipping irrigation")) goodFor.push("Skipping irrigation");
  } else if (w.tempC >= 25) {
    if (!goodFor.includes("Irrigation")) goodFor.push("Irrigation");
  }

  score = Math.max(0, Math.min(100, score));
  const stars = Math.round(score / 20);
  const label = score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Fair" : score >= 30 ? "Poor" : "Bad";

  return { score, stars, label, goodFor: goodFor.slice(0, 4), avoid: avoid.slice(0, 4) };
}

// ---------- Risk meter ----------
function levelFor(day?: WeatherDaily): { level: "low" | "medium" | "high"; reasons: string[] } {
  if (!day) return { level: "low", reasons: [] };
  const reasons: string[] = [];
  let level: "low" | "medium" | "high" = "low";
  if (day.rainProbability >= 80 || day.precipMm >= 15) {
    reasons.push("Heavy rain expected");
    level = "high";
  } else if (day.rainProbability >= 50) {
    reasons.push("Rain likely");
    level = level === "high" ? "high" : "medium";
  }
  if (day.windKph >= 45) {
    reasons.push("Strong winds");
    level = "high";
  } else if (day.windKph >= 25) {
    reasons.push("Windy");
    if (level === "low") level = "medium";
  }
  if (day.tempMaxC >= 40) {
    reasons.push("Extreme heat");
    level = "high";
  } else if (day.tempMaxC >= 36) {
    reasons.push("Very hot");
    if (level === "low") level = "medium";
  }
  if (day.tempMinC <= 4) {
    reasons.push("Frost risk");
    level = "high";
  }
  if (reasons.length === 0) reasons.push("No major risks");
  return { level, reasons };
}

// ---------- Next best action ----------
function pickNextBestAction(recs: Recommendation[]): NextBestAction | null {
  // Prefer actionable low/medium recommendations that reference a clear window.
  const priority: Recommendation["category"][] = ["harvest", "fertilizer", "spraying", "irrigation"];
  for (const cat of priority) {
    const rec = recs.find((r) => r.category === cat);
    if (rec) {
      return {
        title: rec.actions[0] ?? rec.title,
        reason: rec.reason,
        category: rec.category,
        deadline: rec.timing,
      };
    }
  }
  const first = recs[0];
  return first ? { title: first.actions[0] ?? first.title, reason: first.reason, category: first.category } : null;
}

// ---------- Alerts ----------
function buildAlerts(ctx: AdvisorContext): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const { weather, cropStage } = ctx;
  const t = today(weather);
  const tm = tomorrow(weather);

  if (t && (t.rainProbability >= 80 || t.precipMm >= 15)) {
    alerts.push({
      id: "alert_heavy_rain_today",
      title: "Heavy rain today",
      severity: t.precipMm >= 30 ? "critical" : "warning",
      timing: "Today",
      message: `${t.rainProbability}% rain probability, ${t.precipMm.toFixed(1)}mm expected.`,
    });
  }
  if (tm && (tm.rainProbability >= 80 || tm.precipMm >= 15)) {
    alerts.push({
      id: "alert_heavy_rain_tomorrow",
      title: "Heavy rain tomorrow",
      severity: "warning",
      timing: "Tomorrow",
      message: `${tm.rainProbability}% rain probability.`,
    });
  }
  if (weather.current.windKph >= 45) {
    alerts.push({
      id: "alert_high_wind",
      title: "High wind alert",
      severity: "warning",
      timing: "Now",
      message: `Sustained wind at ${weather.current.windKph.toFixed(0)} km/h.`,
    });
  }
  if (t && t.tempMaxC >= 40) {
    alerts.push({
      id: "alert_heatwave",
      title: "Heat wave",
      severity: "critical",
      timing: "Today",
      message: `Peak temperature ${t.tempMaxC.toFixed(0)}°C.`,
    });
  }
  if (t && t.tempMinC <= 4) {
    alerts.push({
      id: "alert_frost",
      title: "Frost alert",
      severity: "critical",
      timing: "Tonight",
      message: `Overnight low ${t.tempMinC.toFixed(0)}°C. ${cropStage === "germination" ? "Young crops at risk." : ""}`.trim(),
    });
  }
  return alerts;
}

// ---------- Public API ----------
export function analyzeWeather(ctx: AdvisorContext): WeatherAdvice {
  const recommendations: Recommendation[] = [];
  for (const rule of RULES) {
    try {
      if (rule.when(ctx)) {
        const built = rule.build(ctx);
        recommendations.push({ id: rule.id, ...built });
      }
    } catch {
      // ignore rule errors — advisor must be resilient
    }
  }
  // Sort: high severity first
  const sevWeight: Record<Recommendation["severity"], number> = { high: 3, medium: 2, low: 1 };
  recommendations.sort((a, b) => sevWeight[b.severity] - sevWeight[a.severity]);

  const score = computeScore(ctx, recommendations);
  const risk: WeatherRisk = {
    today: levelFor(today(ctx.weather)),
    tomorrow: levelFor(tomorrow(ctx.weather)),
  };
  const alerts = buildAlerts(ctx);
  const nextBestAction = pickNextBestAction(recommendations);

  return { score, risk, alerts, recommendations, nextBestAction };
}
