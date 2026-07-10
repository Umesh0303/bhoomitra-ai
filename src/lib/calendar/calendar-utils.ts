import type { Tables } from "@/integrations/supabase/types";
import { findCropTemplate, stageForDay, type CropTemplate } from "./crop-stages";

export type CalendarTask = Tables<"calendar_tasks">;

export function addDaysIso(baseIso: string, days: number): string {
  const d = new Date(baseIso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso).getTime();
  const b = new Date(toIso).getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export type CropProgress = {
  cropName: string;
  template: CropTemplate;
  currentDay: number;
  cycleDays: number;
  percent: number;
  stageId: string;
  stageLabel: string;
};

export function computeCropProgress(cropName: string | null | undefined, sowingDateIso: string | null | undefined): CropProgress | null {
  if (!cropName || !sowingDateIso) return null;
  const template = findCropTemplate(cropName);
  const currentDay = Math.max(0, daysBetween(sowingDateIso, todayIso()));
  const percent = Math.min(100, Math.round((currentDay / template.cycleDays) * 100));
  const stage = stageForDay(template, currentDay);
  return {
    cropName,
    template,
    currentDay,
    cycleDays: template.cycleDays,
    percent,
    stageId: stage.id,
    stageLabel: stage.label,
  };
}

export type TaskAnalytics = {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
};

export function analyzeTasks(tasks: CalendarTask[]): TaskAnalytics {
  const today = todayIso();
  let completed = 0;
  let pending = 0;
  let overdue = 0;
  for (const t of tasks) {
    if (t.status === "completed") completed += 1;
    else if (t.status === "cancelled" || t.status === "skipped") continue;
    else if (t.task_date < today) overdue += 1;
    else pending += 1;
  }
  const denom = completed + pending + overdue;
  const rate = denom === 0 ? 0 : Math.round((completed / denom) * 100);
  return { total: tasks.length, completed, pending, overdue, completionRate: rate };
}

export function groupTasksByStage(tasks: CalendarTask[]): Map<string, CalendarTask[]> {
  const map = new Map<string, CalendarTask[]>();
  for (const t of tasks) {
    const key = t.stage || "other";
    const arr = map.get(key) ?? [];
    arr.push(t);
    map.set(key, arr);
  }
  return map;
}

export function tasksInMonth(tasks: CalendarTask[], year: number, month: number): CalendarTask[] {
  return tasks.filter((t) => {
    const d = new Date(t.task_date);
    return d.getUTCFullYear() === year && d.getUTCMonth() === month;
  });
}

export function tasksInWeekOf(tasks: CalendarTask[], anchorIso: string): CalendarTask[] {
  const anchor = new Date(anchorIso);
  const day = anchor.getUTCDay();
  const start = new Date(anchor);
  start.setUTCDate(anchor.getUTCDate() - day);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return tasks.filter((t) => t.task_date >= start.toISOString().slice(0, 10) && t.task_date <= end.toISOString().slice(0, 10));
}

export function upcomingTasks(tasks: CalendarTask[], limit = 5): CalendarTask[] {
  const today = todayIso();
  return tasks
    .filter((t) => t.status === "upcoming" && t.task_date >= today)
    .sort((a, b) => a.task_date.localeCompare(b.task_date))
    .slice(0, limit);
}

export function overdueTasks(tasks: CalendarTask[]): CalendarTask[] {
  const today = todayIso();
  return tasks
    .filter((t) => t.status === "upcoming" && t.task_date < today)
    .sort((a, b) => a.task_date.localeCompare(b.task_date));
}
