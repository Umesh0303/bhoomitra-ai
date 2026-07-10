import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listCalendarTasks,
  generateFarmCalendar,
  updateTaskStatus,
  deleteFarmCalendar,
} from "@/lib/calendar/crop-calendar.functions";

export function useCalendarTasks(farmId?: string) {
  const list = useServerFn(listCalendarTasks);
  return useQuery({
    queryKey: ["calendarTasks", farmId ?? "all"],
    queryFn: () => list({ data: { farmId } }),
    staleTime: 60_000,
  });
}

export function useGenerateCalendar() {
  const qc = useQueryClient();
  const gen = useServerFn(generateFarmCalendar);
  return useMutation({
    mutationFn: (v: { farmId: string; cropName?: string; sowingDate?: string }) => gen({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendarTasks"] }),
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  const upd = useServerFn(updateTaskStatus);
  return useMutation({
    mutationFn: (v: { taskId: string; status: "upcoming" | "completed" | "skipped" | "delayed" | "cancelled"; newDate?: string; notes?: string }) => upd({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendarTasks"] }),
  });
}

export function useDeleteCalendar() {
  const qc = useQueryClient();
  const del = useServerFn(deleteFarmCalendar);
  return useMutation({
    mutationFn: (v: { farmId: string }) => del({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendarTasks"] }),
  });
}
