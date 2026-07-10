import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { listFarms } from "@/lib/farms";
import { useCalendarTasks, useGenerateCalendar, useUpdateTaskStatus } from "@/hooks/useCropCalendar";
import { computeCropProgress, analyzeTasks, groupTasksByStage, upcomingTasks, todayIso } from "@/lib/calendar/calendar-utils";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/calendar")({
  head: () => ({ meta: [{ title: "Crop Calendar — Bhoomitra AI" }] }),
  component: CalendarPage,
});

type Task = Tables<"calendar_tasks">;

function CalendarPage() {
  const { data: farms = [] } = useQuery({ queryKey: ["farms"], queryFn: listFarms });
  const [farmId, setFarmId] = useState<string | null>(null);
  const active = useMemo(() => farms.find((f) => f.id === farmId) ?? farms[0], [farms, farmId]);
  const { data: tasks = [], isLoading } = useCalendarTasks(active?.id);
  const generate = useGenerateCalendar();
  const updateStatus = useUpdateTaskStatus();
  const [sowing, setSowing] = useState<string>("");
  const [view, setView] = useState<"timeline" | "upcoming" | "all">("timeline");

  const progress = active ? computeCropProgress(active.current_crop, active.sowing_date) : null;
  const analytics = analyzeTasks(tasks);
  const groups = groupTasksByStage(tasks);
  const upcoming = upcomingTasks(tasks, 8);

  async function onGenerate() {
    if (!active) return;
    if (!active.current_crop || active.current_crop === "Empty Field") {
      toast.error("Set a current crop on this farm first");
      return;
    }
    const date = sowing || active.sowing_date || todayIso();
    try {
      await generate.mutateAsync({ farmId: active.id, sowingDate: date });
      toast.success("Schedule generated");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (farms.length === 0) {
    return (
      <div className="mx-auto max-w-3xl py-20 text-center">
        <h1 className="font-display text-2xl font-bold">No farms yet</h1>
        <p className="mt-2 text-muted-foreground">Add a farm with a current crop to generate a farming schedule.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">AI Crop Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Automatic farming schedule based on your crop, sowing date, and stage.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="h-10 rounded-xl border border-border bg-card px-3 text-sm" value={active?.id ?? ""} onChange={(e) => setFarmId(e.target.value)}>
            {farms.map((f) => (<option key={f.id} value={f.id}>{f.farm_name} — {f.current_crop || "No crop"}</option>))}
          </select>
        </div>
      </header>

      {/* Progress + analytics */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary to-primary/85 p-6 text-primary-foreground shadow-card lg:col-span-2">
          <div className="text-xs uppercase tracking-[0.15em] opacity-80">{active?.current_crop || "No crop set"}</div>
          {progress ? (
            <>
              <div className="mt-2 flex items-baseline gap-3">
                <div className="font-display text-4xl font-bold">Day {progress.currentDay}</div>
                <div className="text-sm opacity-90">/ {progress.cycleDays} · {progress.stageLabel}</div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/20">
                <div className="h-full bg-white" style={{ width: `${progress.percent}%` }} />
              </div>
              <div className="mt-2 text-xs opacity-90">{progress.percent}% through crop cycle</div>
            </>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm opacity-90">Set a sowing date to generate the schedule.</p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={sowing}
                  onChange={(e) => setSowing(e.target.value)}
                  className="h-10 rounded-xl border border-white/30 bg-white/10 px-3 text-sm placeholder:text-white/70"
                />
                <button
                  onClick={onGenerate}
                  disabled={generate.isPending || !active?.current_crop || active.current_crop === "Empty Field"}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-card px-4 text-sm font-semibold text-primary disabled:opacity-60"
                >
                  {generate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Generate schedule
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h3 className="font-display text-base font-semibold">Task analytics</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Cell label="Completed" value={analytics.completed} tone="good" />
            <Cell label="Pending" value={analytics.pending} tone="neutral" />
            <Cell label="Overdue" value={analytics.overdue} tone="bad" />
            <Cell label="Completion" value={`${analytics.completionRate}%`} tone="good" />
          </div>
          {progress && (
            <button
              onClick={onGenerate}
              disabled={generate.isPending}
              className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium hover:bg-muted disabled:opacity-60"
            >
              {generate.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Regenerate from templates
            </button>
          )}
        </div>
      </section>

      {/* View switcher */}
      <div className="flex items-center gap-2">
        {(["timeline", "upcoming", "all"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`h-9 rounded-xl border px-3 text-sm capitalize ${view === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"}`}
          >
            {v}
          </button>
        ))}
      </div>

      {isLoading && <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading tasks…</div>}

      {!isLoading && tasks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3">No tasks yet. Set a sowing date above and generate a schedule.</p>
        </div>
      )}

      {view === "timeline" && tasks.length > 0 && (
        <section className="space-y-6">
          {Array.from(groups.entries()).map(([stage, list]) => (
            <div key={stage} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h3 className="font-display text-lg font-semibold capitalize">{stage}</h3>
              <ol className="mt-4 space-y-2">
                {list.map((t) => (
                  <TaskRow key={t.id} task={t} onStatus={(status) => updateStatus.mutate({ taskId: t.id, status })} />
                ))}
              </ol>
            </div>
          ))}
        </section>
      )}

      {view === "upcoming" && (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h3 className="font-display text-lg font-semibold">Upcoming activities</h3>
          <ol className="mt-4 space-y-2">
            {upcoming.map((t) => (<TaskRow key={t.id} task={t} onStatus={(s) => updateStatus.mutate({ taskId: t.id, status: s })} />))}
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Nothing coming up.</p>}
          </ol>
        </section>
      )}

      {view === "all" && (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h3 className="font-display text-lg font-semibold">All tasks</h3>
          <ol className="mt-4 space-y-2">
            {tasks.map((t) => (<TaskRow key={t.id} task={t} onStatus={(s) => updateStatus.mutate({ taskId: t.id, status: s })} />))}
          </ol>
        </section>
      )}
    </div>
  );
}

function Cell({ label, value, tone }: { label: string; value: string | number; tone: "good" | "bad" | "neutral" }) {
  const color = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function TaskRow({ task, onStatus }: { task: Task; onStatus: (s: "completed" | "skipped" | "cancelled" | "upcoming") => void }) {
  const isOverdue = task.status === "upcoming" && task.task_date < todayIso();
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
            task.status === "completed" ? "bg-emerald-500/10 text-emerald-700"
              : task.status === "skipped" || task.status === "cancelled" ? "bg-muted text-muted-foreground"
              : isOverdue ? "bg-destructive/10 text-destructive"
              : task.priority === "high" ? "bg-amber-500/10 text-amber-700"
              : "bg-primary-soft text-primary"
          }`}>
            {task.status === "upcoming" && isOverdue ? "overdue" : task.status}
          </span>
          <div className="truncate font-medium">{task.task_name}</div>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {new Date(task.task_date).toLocaleDateString()} · Day {task.day_offset} · {task.task_type}
          {task.fertilizer_category ? ` · ${task.fertilizer_category}` : ""}
          {task.water_requirement ? ` · water: ${task.water_requirement}` : ""}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {task.status !== "completed" && (
          <button className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-muted" onClick={() => onStatus("completed")} aria-label="Mark complete">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </button>
        )}
        {task.status !== "skipped" && task.status !== "completed" && (
          <button className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-muted" onClick={() => onStatus("skipped")} aria-label="Skip">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        {task.status !== "cancelled" && task.status !== "completed" && (
          <button className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-muted" onClick={() => onStatus("cancelled")} aria-label="Cancel">
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </li>
  );
}
