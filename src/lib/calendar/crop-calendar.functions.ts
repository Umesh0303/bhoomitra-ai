// Server functions for calendar generation, listing, status updates, and
// weather-driven reschedule suggestions.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { findCropTemplate } from "./crop-stages";
import { addDaysIso } from "./calendar-utils";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const generateFarmCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { farmId: string; cropName?: string; sowingDate?: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: farm, error: farmErr } = await supabase
      .from("farms")
      .select("id, current_crop, sowing_date, user_id")
      .eq("id", data.farmId)
      .maybeSingle();
    if (farmErr || !farm) throw new Error("Farm not found");

    const cropName = (data.cropName ?? farm.current_crop ?? "").trim();
    const sowingDate = data.sowingDate ?? farm.sowing_date ?? null;
    if (!cropName || cropName === "Empty Field") throw new Error("Set a current crop first");
    if (!sowingDate) throw new Error("Sowing date is required");

    // If cropName/sowingDate came from arguments, persist them on the farm
    if (data.cropName || data.sowingDate) {
      await supabase
        .from("farms")
        .update({
          ...(data.cropName ? { current_crop: cropName } : {}),
          ...(data.sowingDate ? { sowing_date: sowingDate } : {}),
        })
        .eq("id", farm.id);
    }

    const template = findCropTemplate(cropName);
    const rows: TablesInsert<"calendar_tasks">[] = [];
    for (const t of template.tasks) {
      const hashInput = `${farm.id}:${cropName.toLowerCase()}:${sowingDate}:${t.dayOffset}:${t.taskName}`;
      const template_hash = await sha256Hex(hashInput);
      rows.push({
        farm_id: farm.id,
        user_id: userId,
        crop_name: cropName,
        stage: t.stage,
        stage_id: t.stageId,
        task_name: t.taskName,
        task_type: t.taskType,
        task_date: addDaysIso(sowingDate, t.dayOffset),
        day_offset: t.dayOffset,
        status: "upcoming",
        priority: t.priority,
        source: "template",
        template_hash,
        estimated_duration_days: t.estimatedDurationDays ?? null,
        water_requirement: t.waterRequirement ?? null,
        fertilizer_category: t.fertilizerCategory ?? null,
        metadata: { stageId: t.stageId, cycleDays: template.cycleDays },
      });
    }
    // Idempotent upsert on template_hash
    const { error } = await supabase.from("calendar_tasks").upsert(rows, { onConflict: "template_hash", ignoreDuplicates: true });
    if (error) throw error;
    return { generated: rows.length };
  });

export const listCalendarTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { farmId?: string }) => input)
  .handler(async ({ data, context }): Promise<Tables<"calendar_tasks">[]> => {
    const { supabase } = context;
    let q = supabase.from("calendar_tasks").select("*").order("task_date", { ascending: true });
    if (data.farmId) q = q.eq("farm_id", data.farmId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const updateTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { taskId: string; status: "upcoming" | "completed" | "skipped" | "delayed" | "cancelled"; newDate?: string; notes?: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "completed") patch.completed_at = new Date().toISOString();
    if (data.status === "delayed" && data.newDate) patch.task_date = data.newDate;
    if (data.notes !== undefined) patch.notes = data.notes;
    const { error } = await supabase.from("calendar_tasks").update(patch as never).eq("id", data.taskId);
    if (error) throw error;
    return { ok: true };
  });

export const deleteFarmCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { farmId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("calendar_tasks").delete().eq("farm_id", data.farmId).eq("status", "upcoming");
    if (error) throw error;
    return { ok: true };
  });

// Non-destructive: returns a list of suggestions. UI applies them one at a
// time. Completed tasks are never touched (server-side enforced).
export type RescheduleSuggestion = {
  taskId: string;
  taskName: string;
  currentDate: string;
  suggestedDate: string;
  reason: string;
  severity: "medium" | "high";
};

export const suggestReschedules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { farmId: string; badDays: string[]; goodDay: string }) => input)
  .handler(async ({ data, context }): Promise<RescheduleSuggestion[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("calendar_tasks")
      .select("*")
      .eq("farm_id", data.farmId)
      .in("status", ["upcoming", "delayed"]);
    if (error) throw error;
    const suggestions: RescheduleSuggestion[] = [];
    for (const t of rows ?? []) {
      if (!data.badDays.includes(t.task_date)) continue;
      // Only reschedule weather-sensitive tasks
      if (!["fertilizer", "spraying", "harvest"].includes(t.task_type)) continue;
      suggestions.push({
        taskId: t.id,
        taskName: t.task_name,
        currentDate: t.task_date,
        suggestedDate: data.goodDay,
        reason: `Adverse weather on ${t.task_date}. Move to ${data.goodDay}.`,
        severity: t.task_type === "harvest" ? "high" : "medium",
      });
    }
    return suggestions;
  });
