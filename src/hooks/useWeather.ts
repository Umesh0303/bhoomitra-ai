import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFarmWeather } from "@/lib/weather/weather-service.functions";
import { analyzeWeather } from "@/lib/weather/weather-advisor";

export function useFarmWeather(farmId: string | null, cropStage?: string | null, soilType?: string | null, cropName?: string | null) {
  const fetchWeather = useServerFn(getFarmWeather);
  const q = useQuery({
    queryKey: ["farmWeather", farmId],
    queryFn: () => fetchWeather({ data: { farmId: farmId! } }),
    enabled: !!farmId,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
  const advice = q.data ? analyzeWeather({ weather: q.data, cropName, cropStage, soilType }) : null;
  return { ...q, advice };
}
