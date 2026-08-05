import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, History } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/crop-health/")({
  component: CropHealthOverview,
  head: () => ({
    meta: [
      { title: "Crop Health – Bhoomitra AI" },
      {
        name: "description",
        content:
          "Detect crop diseases from photos with evidence-based AI that combines farm context, weather and agronomy knowledge.",
      },
      { property: "og:title", content: "Crop Health – Bhoomitra AI" },
      {
        property: "og:description",
        content: "AI crop disease detection with weather-aware, explainable diagnosis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function CropHealthOverview() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Link
        to="/app/crop-health/scan"
        className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary"
      >
        <Camera className="h-6 w-6 text-primary" />
        <h2 className="mt-3 font-display text-lg font-bold">Start a new scan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Take photos of the affected plant and get an explainable diagnosis with a treatment plan.
        </p>
      </Link>
      <Link
        to="/app/crop-health/history"
        className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary"
      >
        <History className="h-6 w-6 text-primary" />
        <h2 className="mt-3 font-display text-lg font-bold">Scan history</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review past diagnoses, confidence and recovery progress for each farm.
        </p>
      </Link>
    </div>
  );
}
