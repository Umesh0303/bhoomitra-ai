import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Loader2, Trash2 } from "lucide-react";
import { ScanReport } from "@/features/crop-health/components/ScanReport";
import {
  deleteScan,
  getScanWithMedia,
  signScanImages,
} from "@/features/crop-health/services/scan-client";
import { createScanReminders } from "@/features/crop-health/crop-health.functions";

export const Route = createFileRoute("/_authenticated/app/crop-health/$scanId")({
  component: ScanReportPage,
  head: () => ({
    meta: [
      { title: "Scan Report – Bhoomitra AI" },
      {
        name: "description",
        content:
          "Full evidence-based crop diagnosis: confidence, reasoning, differentials, treatment plan and weather risk.",
      },
      { property: "og:title", content: "Scan Report – Bhoomitra AI" },
      {
        property: "og:description",
        content: "Explainable AI crop diagnosis with a step-by-step treatment plan.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ScanReportPage() {
  const { scanId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const remind = useServerFn(createScanReminders);
  const [scheduling, setScheduling] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["crop-scan", scanId],
    queryFn: async () => {
      const scan = await getScanWithMedia(scanId);
      if (!scan) return null;
      const urlMap = await signScanImages(scan.crop_scan_images.map((i) => i.storage_path));
      return {
        scan,
        imageUrls: scan.crop_scan_images
          .map((i) => urlMap[i.storage_path])
          .filter(Boolean) as string[],
      };
    },
  });

  async function schedule() {
    setScheduling(true);
    try {
      await remind({ data: { scanId } });
      toast.success("Follow-up tasks added to your crop calendar");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add reminders");
    } finally {
      setScheduling(false);
    }
  }

  async function removeScan() {
    try {
      await deleteScan(scanId);
      await queryClient.invalidateQueries({ queryKey: ["crop-scans"] });
      toast.success("Scan deleted");
      navigate({ to: "/app/crop-health/history" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete this scan");
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading report…</p>;

  if (!data?.scan) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        This scan could not be found.{" "}
        <Link to="/app/crop-health/history" className="font-medium text-primary hover:underline">
          Back to history
        </Link>
      </div>
    );
  }

  if (data.scan.status !== "completed" || !data.scan.diagnosis) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-bold">Scan not completed</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This scan stopped at the "{data.scan.status}" step. Start a new scan to get a diagnosis.
        </p>
        <div className="mt-4 flex gap-2">
          <Link
            to="/app/crop-health/scan"
            className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            New scan
          </Link>
          <button
            onClick={removeScan}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-destructive"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScanReport scan={data.scan} imageUrls={data.imageUrls} />
      <div className="flex flex-wrap gap-2">
        <button
          onClick={schedule}
          disabled={scheduling}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
          Add follow-up to calendar
        </button>
        <Link
          to="/app/crop-health/scan"
          className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted"
        >
          New scan
        </Link>
        <button
          onClick={removeScan}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-destructive hover:bg-muted"
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>
    </div>
  );
}
