import { createFileRoute } from "@tanstack/react-router";
import { FileBarChart2, Download } from "lucide-react";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_authenticated/app/reports")({
  head: () => ({ meta: [{ title: "Reports — Bhoomitra AI" }] }),
  component: ReportsPage,
});

const reports = [
  { title: "Monthly Farm Summary", date: "Nov 2026", type: "Summary" },
  { title: "Crop Health Snapshot", date: "Oct 2026", type: "Health" },
  { title: "Soil Inputs Log", date: "Sep 2026", type: "Inputs" },
];

function ReportsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sample reports — automated insights arrive in a future version.
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-6 py-3 font-medium">Report</th>
              <th className="px-6 py-3 font-medium">Period</th>
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.title} className="border-b border-border last:border-0">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary">
                      <FileBarChart2 className="h-[1.125rem] w-[1.125rem]" />
                    </span>
                    <span className="font-medium">{r.title}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-muted-foreground">{r.date}</td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                    {r.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PagePlaceholder
        title="AI-generated reports"
        body="Personalized productivity reports and predictive insights are on the roadmap."
      />
    </div>
  );
}
