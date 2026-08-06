import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Camera, Leaf } from "lucide-react";
import { listScanHistory } from "@/features/crop-health/services/scan-client";
import { DISEASE_TYPE_LABEL, type DiseaseType } from "@/features/crop-health/types";

export const Route = createFileRoute("/_authenticated/app/crop-health/history")({
  component: ScanHistoryPage,
  head: () => ({
    meta: [
      { title: "Scan History – Bhoomitra AI" },
      {
        name: "description",
        content: "Review past crop health scans, diagnoses, confidence levels and recovery progress.",
      },
      { property: "og:title", content: "Scan History – Bhoomitra AI" },
      {
        property: "og:description",
        content: "All your past AI crop diagnoses in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ScanHistoryPage() {
  const { data: scans = [], isLoading } = useQuery({
    queryKey: ["crop-scans"],
    queryFn: () => listScanHistory(),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading scans…</p>;
  }

  if (!scans.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <Leaf className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">No scans yet.</p>
        <Link
          to="/app/crop-health/scan"
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          <Camera className="h-4 w-4" /> Start your first scan
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {scans.map((s) => {
        const diagnosis = (s.diagnosis as { name?: string } | null)?.name;
        return (
          <Link
            key={s.id}
            to="/app/crop-health/$scanId"
            params={{ scanId: s.id }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary"
          >
            <div className="min-w-0">
              <div className="font-medium">
                {diagnosis || (s.status === "completed" ? "Diagnosis" : "Incomplete scan")}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(s.created_at).toLocaleString()} · {s.crop_name || "Unknown crop"} ·{" "}
                {s.crop_scan_images?.length ?? 0} photo(s)
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {s.disease_type && (
                <span className="rounded-full bg-muted px-2.5 py-1 font-medium">
                  {DISEASE_TYPE_LABEL[s.disease_type as DiseaseType] ?? s.disease_type}
                </span>
              )}
              {typeof s.confidence === "number" && (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                  {Math.round(s.confidence)}% confident
                </span>
              )}
              <span className="rounded-full border border-border px-2.5 py-1 capitalize text-muted-foreground">
                {s.status}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
