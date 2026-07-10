// Server function: fetch weather for a farm through the Google Maps Weather
// API (via the Lovable connector gateway), with per-farm caching in
// weather_cache (~2h TTL).
//
// Provider is isolated here — swap this file to change data source.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  FarmWeather,
  WeatherCondition,
  WeatherCurrent,
  WeatherDaily,
  WeatherHourly,
} from "./weather-types";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2h

// ---- Google Weather API response shape (partial) ----
interface GTemp {
  degrees?: number;
  unit?: string;
}
interface GWeatherCondition {
  type?: string;
  description?: { text?: string };
}
interface GWind {
  speed?: { value?: number; unit?: string };
  direction?: { cardinal?: string };
}
interface GPrecipProbability {
  percent?: number;
}
interface GPrecipQpf {
  quantity?: number;
  unit?: string;
}
interface GPrecipitation {
  probability?: GPrecipProbability;
  qpf?: GPrecipQpf;
}
interface GCurrentResp {
  temperature?: GTemp;
  feelsLikeTemperature?: GTemp;
  weatherCondition?: GWeatherCondition;
  relativeHumidity?: number;
  wind?: GWind;
  uvIndex?: number;
  precipitation?: GPrecipitation;
  cloudCover?: number;
  currentTime?: string;
  isDaytime?: boolean;
}

interface GInterval {
  startTime?: string;
  endTime?: string;
}
interface GHourItem {
  interval?: GInterval;
  temperature?: GTemp;
  feelsLikeTemperature?: GTemp;
  weatherCondition?: GWeatherCondition;
  wind?: GWind;
  precipitation?: GPrecipitation;
  relativeHumidity?: number;
}
interface GHoursResp {
  forecastHours?: GHourItem[];
}

interface GDayPart {
  weatherCondition?: GWeatherCondition;
  wind?: GWind;
  precipitation?: GPrecipitation;
  relativeHumidity?: number;
  uvIndex?: number;
}
interface GDayItem {
  displayDate?: { year?: number; month?: number; day?: number };
  interval?: GInterval;
  maxTemperature?: GTemp;
  minTemperature?: GTemp;
  daytimeForecast?: GDayPart;
  nighttimeForecast?: GDayPart;
  sunEvents?: { sunriseTime?: string; sunsetTime?: string };
}
interface GDaysResp {
  forecastDays?: GDayItem[];
}

// ---- Mappers ----
function mapCondition(type?: string): { c: WeatherCondition; label: string } {
  const t = (type ?? "UNKNOWN").toUpperCase();
  const map: Record<string, { c: WeatherCondition; label: string }> = {
    CLEAR: { c: "clear", label: "Clear" },
    MOSTLY_CLEAR: { c: "clear", label: "Mostly clear" },
    PARTLY_CLOUDY: { c: "partly_cloudy", label: "Partly cloudy" },
    MOSTLY_CLOUDY: { c: "cloudy", label: "Mostly cloudy" },
    CLOUDY: { c: "cloudy", label: "Cloudy" },
    WINDY: { c: "windy", label: "Windy" },
    WIND_AND_RAIN: { c: "heavy_rain", label: "Wind and rain" },
    LIGHT_RAIN_SHOWERS: { c: "rain", label: "Light rain" },
    CHANCE_OF_SHOWERS: { c: "rain", label: "Chance of showers" },
    SCATTERED_SHOWERS: { c: "rain", label: "Scattered showers" },
    RAIN_SHOWERS: { c: "rain", label: "Rain showers" },
    HEAVY_RAIN_SHOWERS: { c: "heavy_rain", label: "Heavy rain" },
    LIGHT_TO_MODERATE_RAIN: { c: "rain", label: "Light to moderate rain" },
    MODERATE_TO_HEAVY_RAIN: { c: "heavy_rain", label: "Moderate to heavy rain" },
    RAIN: { c: "rain", label: "Rain" },
    LIGHT_RAIN: { c: "rain", label: "Light rain" },
    HEAVY_RAIN: { c: "heavy_rain", label: "Heavy rain" },
    RAIN_PERIODICALLY_HEAVY: { c: "heavy_rain", label: "Rain, sometimes heavy" },
    LIGHT_SNOW_SHOWERS: { c: "snow", label: "Light snow" },
    CHANCE_OF_SNOW_SHOWERS: { c: "snow", label: "Chance of snow" },
    SCATTERED_SNOW_SHOWERS: { c: "snow", label: "Scattered snow" },
    SNOW_SHOWERS: { c: "snow", label: "Snow" },
    HEAVY_SNOW_SHOWERS: { c: "snow", label: "Heavy snow" },
    LIGHT_TO_MODERATE_SNOW: { c: "snow", label: "Light to moderate snow" },
    MODERATE_TO_HEAVY_SNOW: { c: "snow", label: "Heavy snow" },
    SNOW: { c: "snow", label: "Snow" },
    LIGHT_SNOW: { c: "snow", label: "Light snow" },
    HEAVY_SNOW: { c: "snow", label: "Heavy snow" },
    SNOWSTORM: { c: "snow", label: "Snowstorm" },
    SNOW_PERIODICALLY_HEAVY: { c: "snow", label: "Snow, sometimes heavy" },
    HEAVY_SNOW_STORM: { c: "snow", label: "Heavy snowstorm" },
    BLOWING_SNOW: { c: "snow", label: "Blowing snow" },
    RAIN_AND_SNOW: { c: "snow", label: "Rain and snow" },
    HAIL: { c: "thunderstorm", label: "Hail" },
    HAIL_SHOWERS: { c: "thunderstorm", label: "Hail showers" },
    THUNDERSTORM: { c: "thunderstorm", label: "Thunderstorm" },
    THUNDERSHOWER: { c: "thunderstorm", label: "Thundershower" },
    LIGHT_THUNDERSTORM_RAIN: { c: "thunderstorm", label: "Light thunderstorm" },
    SCATTERED_THUNDERSTORMS: { c: "thunderstorm", label: "Scattered thunderstorms" },
    HEAVY_THUNDERSTORM: { c: "thunderstorm", label: "Heavy thunderstorm" },
  };
  return map[t] ?? { c: "unknown", label: "Unknown" };
}

function normalizeCurrent(r: GCurrentResp): WeatherCurrent {
  const cond = mapCondition(r.weatherCondition?.type);
  return {
    tempC: r.temperature?.degrees ?? 0,
    feelsLikeC: r.feelsLikeTemperature?.degrees ?? r.temperature?.degrees ?? 0,
    humidity: r.relativeHumidity ?? 0,
    windKph: r.wind?.speed?.value ?? 0,
    windDirection: r.wind?.direction?.cardinal,
    uvIndex: r.uvIndex ?? 0,
    rainProbability: r.precipitation?.probability?.percent ?? 0,
    condition: cond.c,
    conditionLabel: r.weatherCondition?.description?.text ?? cond.label,
    cloudCover: r.cloudCover,
    observedAtIso: r.currentTime ?? new Date().toISOString(),
  };
}

function normalizeHourly(items: GHourItem[]): WeatherHourly[] {
  return items.slice(0, 24).map((h) => {
    const cond = mapCondition(h.weatherCondition?.type);
    return {
      timeIso: h.interval?.startTime ?? new Date().toISOString(),
      tempC: h.temperature?.degrees ?? 0,
      rainProbability: h.precipitation?.probability?.percent ?? 0,
      precipMm: h.precipitation?.qpf?.quantity ?? 0,
      windKph: h.wind?.speed?.value ?? 0,
      condition: cond.c,
      conditionLabel: h.weatherCondition?.description?.text ?? cond.label,
    };
  });
}

function normalizeDaily(items: GDayItem[]): WeatherDaily[] {
  return items.slice(0, 7).map((d) => {
    const day = d.daytimeForecast;
    const cond = mapCondition(day?.weatherCondition?.type);
    const yr = d.displayDate?.year ?? new Date().getFullYear();
    const mo = String(d.displayDate?.month ?? 1).padStart(2, "0");
    const dy = String(d.displayDate?.day ?? 1).padStart(2, "0");
    return {
      dateIso: `${yr}-${mo}-${dy}`,
      tempMaxC: d.maxTemperature?.degrees ?? 0,
      tempMinC: d.minTemperature?.degrees ?? 0,
      rainProbability: day?.precipitation?.probability?.percent ?? 0,
      precipMm: day?.precipitation?.qpf?.quantity ?? 0,
      windKph: day?.wind?.speed?.value ?? 0,
      humidity: day?.relativeHumidity ?? 0,
      uvIndex: day?.uvIndex ?? 0,
      condition: cond.c,
      conditionLabel: day?.weatherCondition?.description?.text ?? cond.label,
      sunriseIso: d.sunEvents?.sunriseTime,
      sunsetIso: d.sunEvents?.sunsetTime,
    };
  });
}

async function gatewayGet<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const key = process.env.LOVABLE_API_KEY;
  const connKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!key || !connKey) throw new Error("Google Maps connector is not configured");
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
  const res = await fetch(`${GATEWAY_URL}${path}?${qs.toString()}`, {
    headers: {
      Authorization: `Bearer ${key}`,
      "X-Connection-Api-Key": connKey,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Weather gateway ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export const getFarmWeather = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { farmId: string; force?: boolean }) => input)
  .handler(async ({ data, context }): Promise<FarmWeather> => {
    const { supabase, userId } = context;

    // Load farm to get coordinates
    const { data: farm, error: farmErr } = await supabase
      .from("farms")
      .select("id, latitude, longitude, user_id")
      .eq("id", data.farmId)
      .maybeSingle();
    if (farmErr || !farm) throw new Error("Farm not found");
    if (!farm.latitude || !farm.longitude) throw new Error("Farm has no GPS location — set it on the farm page first.");

    // Cache lookup
    if (!data.force) {
      const { data: cached } = await supabase
        .from("weather_cache")
        .select("*")
        .eq("farm_id", data.farmId)
        .maybeSingle();
      if (cached && new Date(cached.expires_at).getTime() > Date.now()) {
        return {
          farmId: farm.id,
          latitude: farm.latitude,
          longitude: farm.longitude,
          fetchedAtIso: cached.fetched_at,
          expiresAtIso: cached.expires_at,
          current: cached.current as unknown as WeatherCurrent,
          hourly: cached.hourly as unknown as WeatherHourly[],
          daily: cached.daily as unknown as WeatherDaily[],
          alerts: [],
        };
      }
    }

    const loc = { "location.latitude": farm.latitude, "location.longitude": farm.longitude };
    const [curr, hours, days] = await Promise.all([
      gatewayGet<GCurrentResp>("/weather/v1/currentConditions:lookup", loc),
      gatewayGet<GHoursResp>("/weather/v1/forecast/hours:lookup", { ...loc, hours: 24 }),
      gatewayGet<GDaysResp>("/weather/v1/forecast/days:lookup", { ...loc, days: 7 }),
    ]);

    const current = normalizeCurrent(curr);
    const hourly = normalizeHourly(hours.forecastHours ?? []);
    const daily = normalizeDaily(days.forecastDays ?? []);
    if (daily[0]?.sunriseIso) current.sunriseIso = daily[0].sunriseIso;
    if (daily[0]?.sunsetIso) current.sunsetIso = daily[0].sunsetIso;

    const now = new Date();
    const expires = new Date(now.getTime() + CACHE_TTL_MS);
    const payload = {
      farm_id: farm.id,
      user_id: userId,
      fetched_at: now.toISOString(),
      expires_at: expires.toISOString(),
      current: current as unknown as Record<string, unknown>,
      hourly: hourly as unknown as Record<string, unknown>[],
      daily: daily as unknown as Record<string, unknown>[],
      alerts: [] as Record<string, unknown>[],
    };
    await supabase.from("weather_cache").upsert(payload as never, { onConflict: "farm_id" });

    return {
      farmId: farm.id,
      latitude: farm.latitude,
      longitude: farm.longitude,
      fetchedAtIso: payload.fetched_at,
      expiresAtIso: payload.expires_at,
      current,
      hourly,
      daily,
      alerts: [],
    };
  });
