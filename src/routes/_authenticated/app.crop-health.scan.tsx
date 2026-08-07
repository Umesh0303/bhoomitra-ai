import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles, Tractor } from "lucide-react";
import { listFarms } from "@/lib/farms";
import { CameraGuidance } from "@/features/crop-health/components/CameraGuidance";
import { FarmContextCard } from "@/features/crop-health/components/FarmContextCard";
import { ImageUploader } from "@/features/crop-health/components/ImageUploader";
import { AnalysisProgress } from "@/features/crop-health/components/AnalysisProgress";
import { QuestionForm } from "@/features/crop-health/components/QuestionForm";
import { ScanDebugPanel } from "@/features/crop-health/components/ScanDebugPanel";
import {
  createScan,
  analyzeScanImages,
  generateScanQuestions,
  saveScanAnswers,
  fuseScanEvidence,
} from "@/features/crop-health/crop-health.functions";
import {
  emptyDebug,
  mergeDebug,
  parseStageError,
  stageErrorMessage,
  type ScanDebug,
  type StageErrorPayload,
} from "@/features/crop-health/diagnostics";
import {
  getScanWithMedia,
  uploadScanImages,
  type PendingImage,
} from "@/features/crop-health/services/scan-client";
import {
  ANALYSIS_STEPS,
  type CropScanQuestionRow,
  type FarmSnapshot,
  type WeatherSnapshot,
} from "@/features/crop-health/types";


export const Route = createFileRoute("/_authenticated/app/crop-health/scan")({
  component: ScanWizard,
  head: () => ({
    meta: [
      { title: "New Crop Scan – Bhoomitra AI" },
      {
        name: "description",
        content:
          "Upload crop photos and get an explainable AI diagnosis combining farm context, weather and agronomy knowledge.",
      },
      { property: "og:title", content: "New Crop Scan – Bhoomitra AI" },
      {
        property: "og:description",
        content: "Start an AI crop disease scan with weather-aware, evidence-based reasoning.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Step = "farm" | "photos" | "analyzing" | "questions" | "fusing";

function ScanWizard() {
  const navigate = useNavigate();
  const { data: farms = [], isLoading: farmsLoading } = useQuery({
    queryKey: ["farms"],
    queryFn: listFarms,
  });

  const create = useServerFn(createScan);
  const analyze = useServerFn(analyzeScanImages);
  const askQuestions = useServerFn(generateScanQuestions);
  const saveAnswers = useServerFn(saveScanAnswers);
  const fuse = useServerFn(fuseScanEvidence);

  const [step, setStep] = useState<Step>("farm");
  const [farmId, setFarmId] = useState<string>("");
  const [scanId, setScanId] = useState<string | null>(null);
  const [farm, setFarm] = useState<FarmSnapshot | null>(null);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [images, setImages] = useState<PendingImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [questions, setQuestions] = useState<CropScanQuestionRow[]>([]);
  const [busy, setBusy] = useState(false);

  const selectedFarm = useMemo(() => farms.find((f) => f.id === farmId), [farms, farmId]);

  async function startScan() {
    if (!farmId) {
      toast.error("Choose a farm first");
      return;
    }
    setBusy(true);
    try {
      const res = await create({ data: { farmId } });
      setScanId(res.scanId);
      setFarm(res.farm as FarmSnapshot);
      setWeather(res.weather as WeatherSnapshot);
      setStep("photos");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the scan");
    } finally {
      setBusy(false);
    }
  }

  async function runAnalysis() {
    if (!scanId) return;
    if (!images.length) {
      toast.error("Add at least one photo");
      return;
    }
    setUploading(true);
    try {
      await uploadScanImages(scanId, images, (done, total) => setProgress({ done, total }));
    } catch (err) {
      setUploading(false);
      toast.error(err instanceof Error ? err.message : "Photo upload failed");
      return;
    }
    setUploading(false);
    setProgress(null);
    setStep("analyzing");
    setActiveStep(0);
    try {
      await analyze({ data: { scanId } });
      setActiveStep(4);
      await askQuestions({ data: { scanId } });
      const scan = await getScanWithMedia(scanId);
      const qs = [...(scan?.crop_scan_questions ?? [])].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
      );
      setQuestions(qs);
      setStep("questions");
    } catch (err) {
      setStep("photos");
      toast.error(err instanceof Error ? err.message : "Analysis failed. Try again.");
    }
  }

  async function finish(answers: Array<{ id: string; answer: string }>) {
    if (!scanId) return;
    setStep("fusing");
    setActiveStep(5);
    try {
      if (answers.length) await saveAnswers({ data: { scanId, answers } });
      setActiveStep(6);
      await fuse({ data: { scanId } });
      setActiveStep(7);
      navigate({ to: "/app/crop-health/$scanId", params: { scanId } });
    } catch (err) {
      setStep("questions");
      toast.error(err instanceof Error ? err.message : "Could not complete the diagnosis");
    }
  }

  if (step === "farm") {
    return (
      <div className="space-y-4">
        <CameraGuidance />
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Tractor className="h-5 w-5 text-primary" /> Which farm is this?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The diagnosis uses this farm's crop, soil and recent weather.
          </p>
          {farmsLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading farms…</p>
          ) : farms.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Add a farm first to run a scan.
            </p>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {farms.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFarmId(f.id)}
                  className={[
                    "rounded-xl border px-4 py-3 text-left text-sm",
                    farmId === f.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted",
                  ].join(" ")}
                >
                  <span className="font-medium">{f.farm_name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {f.current_crop || "No crop set"} · {f.village}, {f.district}
                  </span>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={startScan}
            disabled={busy || !farmId}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {farm && weather && <FarmContextCard farm={farm} weather={weather} />}

      {step === "photos" && (
        <>
          <CameraGuidance />
          <ImageUploader
            images={images}
            onChange={setImages}
            uploading={uploading}
            progress={progress}
          />
          <button
            onClick={runAnalysis}
            disabled={uploading || images.length === 0}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Analyse {images.length ? `${images.length} photo${images.length > 1 ? "s" : ""}` : ""}
          </button>
          {selectedFarm && (
            <p className="text-xs text-muted-foreground">Scanning for {selectedFarm.farm_name}</p>
          )}
        </>
      )}

      {(step === "analyzing" || step === "fusing") && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold">Working on your diagnosis</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            This takes about a minute. Keep this page open.
          </p>
          <AnalysisProgress steps={ANALYSIS_STEPS} activeIndex={activeStep} />
        </div>
      )}

      {step === "questions" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-bold">A few quick questions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your answers raise the confidence of the final diagnosis.
            </p>
          </div>
          <QuestionForm questions={questions} onSubmit={finish} />
          <button
            onClick={() => finish([])}
            className="text-sm font-medium text-muted-foreground underline"
          >
            Skip questions and diagnose now
          </button>
        </div>
      )}
    </div>
  );
}
