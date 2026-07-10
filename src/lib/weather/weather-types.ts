// Normalized weather types. Provider-agnostic so we can swap Google Maps
// Weather API for another source later without touching the UI.

export type WeatherCondition =
  | "clear"
  | "partly_cloudy"
  | "cloudy"
  | "overcast"
  | "rain"
  | "heavy_rain"
  | "thunderstorm"
  | "snow"
  | "fog"
  | "windy"
  | "hot"
  | "cold"
  | "unknown";

export type WeatherCurrent = {
  tempC: number;
  feelsLikeC: number;
  humidity: number; // %
  windKph: number;
  windDirection?: string;
  uvIndex: number;
  rainProbability: number; // 0-100
  condition: WeatherCondition;
  conditionLabel: string;
  cloudCover?: number;
  sunriseIso?: string;
  sunsetIso?: string;
  observedAtIso: string;
};

export type WeatherHourly = {
  timeIso: string;
  tempC: number;
  rainProbability: number;
  precipMm: number;
  windKph: number;
  condition: WeatherCondition;
  conditionLabel: string;
};

export type WeatherDaily = {
  dateIso: string; // YYYY-MM-DD
  tempMaxC: number;
  tempMinC: number;
  rainProbability: number;
  precipMm: number;
  windKph: number;
  humidity: number;
  uvIndex: number;
  condition: WeatherCondition;
  conditionLabel: string;
  sunriseIso?: string;
  sunsetIso?: string;
};

export type WeatherAlert = {
  id: string;
  title: string;
  severity: "info" | "warning" | "critical";
  timing: string;
  affectedFarmId?: string;
  message: string;
};

export type FarmWeather = {
  farmId: string;
  latitude: number;
  longitude: number;
  fetchedAtIso: string;
  expiresAtIso: string;
  current: WeatherCurrent;
  hourly: WeatherHourly[];
  daily: WeatherDaily[];
  alerts: WeatherAlert[];
};

// Advisor outputs
export type Recommendation = {
  id: string;
  title: string;
  actions: string[];
  reason: string;
  severity: "low" | "medium" | "high";
  category:
    | "irrigation"
    | "spraying"
    | "fertilizer"
    | "harvest"
    | "wind"
    | "heat"
    | "cold"
    | "rain"
    | "frost"
    | "disease"
    | "general";
  cropStage?: string;
  timing?: string;
};

export type WeatherScore = {
  score: number; // 0-100
  stars: number; // 0-5
  label: string; // "Excellent" | "Good" | "Fair" | "Poor" | "Bad"
  goodFor: string[];
  avoid: string[];
};

export type RiskLevel = "low" | "medium" | "high";
export type WeatherRisk = {
  today: { level: RiskLevel; reasons: string[] };
  tomorrow: { level: RiskLevel; reasons: string[] };
};

export type NextBestAction = {
  title: string;
  reason: string;
  deadline?: string;
  category: Recommendation["category"];
};

export type WeatherAdvice = {
  score: WeatherScore;
  risk: WeatherRisk;
  nextBestAction: NextBestAction | null;
  recommendations: Recommendation[];
  alerts: WeatherAlert[];
};
