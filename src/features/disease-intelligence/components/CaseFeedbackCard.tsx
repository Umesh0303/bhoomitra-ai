// Farmer-facing feedback and treatment outcome, shown under a completed scan
// report. Purely additive: if anything here fails, the report still stands.

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Camera, CheckCircle2, Loader2, MessageSquareHeart, Sprout, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SCAN_BUCKET, signScanImage } from "@/features/crop-health/services/scan-client";
import {
  compressImage,
  type CompressedImage,
} from "@/features/crop-health/services/image-compress";
import {
  attachFollowupPhoto,
  getCaseForScan,
  submitDiagnosisFeedback,
  submitTreatmentOutcome,
} from "../disease-intelligence.functions";
import { DIAGNOSIS_RATINGS, OUTCOMES } from "../types";

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

function PhotoPicker({
  photo,
  onPick,
  onRemove,
}: {
  photo: CompressedImage | null;
  onPick: (f: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="mt-3">
      <p className="text-sm font-medium">Optional: Add a follow-up photo</p>
      {photo ? (
        <div className="relative mt-2 inline-block">
          <img
            src={photo.previewUrl}
            alt="Follow-up preview"
            className="h-32 w-32 rounded-xl object-cover"
          />
          <button
            onClick={onRemove}
            aria-label="Remove photo"
            className="absolute -right-2 -top-2 rounded-full bg-background p-1 shadow"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 text-sm hover:bg-muted">
          <Camera className="h-4 w-4" /> Choose photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPick(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}

export function CaseFeedbackCard({ scanId }: { scanId: string }) {
  const queryClient = useQueryClient();
  const loadCase = useServerFn(getCaseForScan);
  const sendFeedback = useServerFn(submitDiagnosisFeedback);
  const sendOutcome = useServerFn(submitTreatmentOutcome);

  const { data, isLoading } = useQuery({
    queryKey: ["disease-case", scanId],
    queryFn: () => loadCase({ data: { scanId } }),
    retry: false,
  });

  const [rating, setRating] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);

  const [showOutcome, setShowOutcome] = useState(false);
  const [treatmentFollowed, setTreatmentFollowed] = useState(true);
  const [days, setDays] = useState("");
  const [outcome, setOutcome] = useState<string>("");
  const [confirmedDisease, setConfirmedDisease] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [savingOutcome, setSavingOutcome] = useState(false);
  const [notTried, setNotTried] = useState(false);
  const [photo, setPhoto] = useState<CompressedImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const attachPhoto = useServerFn(attachFollowupPhoto);

  const followupPaths = (
    Array.isArray(data?.outcome?.followup_images) ? (data.outcome.followup_images as any[]) : []
  )
    .map((f) => (typeof f === "string" ? f : f?.path))
    .filter((p): p is string => typeof p === "string");
  const { data: followupUrl } = useQuery({
    queryKey: ["followup-photo", followupPaths[0]],
    queryFn: () => signScanImage(followupPaths[0]),
    enabled: followupPaths.length > 0,
  });

  if (isLoading || !data?.case) return null;
  const caseId = data.case.id as string;
  const hasFeedback = Boolean(data.feedback);
  const hasOutcome = Boolean(data.outcome);
  const hasFollowup = followupPaths.length > 0;
  const outcomeId = (data.outcome?.id as string | undefined) ?? null;

  async function pickPhoto(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a photo");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Photo is too large (max 15 MB)");
      return;
    }
    setPhoto(await compressImage(file));
  }

  /** Uploads the follow-up photo separately so the outcome is never lost. */
  async function uploadPhoto(forOutcomeId: string) {
    if (!photo) return true;
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const path = `${u.user.id}/followup/${caseId}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from(SCAN_BUCKET)
        .upload(path, photo.file, { upsert: false, contentType: "image/jpeg" });
      if (error) throw error;
      await attachPhoto({ data: { outcomeId: forOutcomeId, path } });
      setPhoto(null);
      await queryClient.invalidateQueries({ queryKey: ["disease-case", scanId] });
      toast.success("Follow-up photo saved");
      return true;
    } catch {
      toast.error("Outcome saved, but the photo could not be uploaded. Please try the photo again.");
      return false;
    } finally {
      setUploading(false);
    }
  }

  async function saveFeedback() {
    if (!rating) {
      toast.error("Pick one option first");
      return;
    }
    setSavingFeedback(true);
    try {
      await sendFeedback({ data: { caseId, rating, notes: notes || null } });
      await queryClient.invalidateQueries({ queryKey: ["disease-case", scanId] });
      toast.success("Thanks — your feedback helps improve future diagnoses");
      setShowOutcome(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your feedback");
    } finally {
      setSavingFeedback(false);
    }
  }

  async function saveOutcome() {
    if (!outcome) {
      toast.error("Tell us how the crop responded");
      return;
    }
    setSavingOutcome(true);
    try {
      const res = await sendOutcome({
        data: {
          caseId,
          treatmentFollowed,
          daysAfterTreatment: days ? Number(days) : null,
          outcome,
          confirmedDisease: confirmedDisease || null,
          notes: outcomeNotes || null,
        },
      });
      toast.success("Outcome recorded");
      if (photo && res?.outcomeId) await uploadPhoto(res.outcomeId);
      await queryClient.invalidateQueries({ queryKey: ["disease-case", scanId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the outcome");
    } finally {
      setSavingOutcome(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {hasFeedback ? "Diagnosis feedback recorded" : "Help improve Bhoomitra AI"}
        </p>
        <h2 className="mt-1 flex items-center gap-2 font-display text-lg font-bold">
          <MessageSquareHeart className="h-5 w-5 text-primary" /> Was this diagnosis correct?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your answer is only used to improve future diagnoses for this crop.
        </p>


        {hasFeedback ? (
          <p className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
            <CheckCircle2 className="h-4 w-4" />
            You rated this diagnosis "
            {DIAGNOSIS_RATINGS.find((r) => r.value === data.feedback?.diagnosis_rating)?.label ??
              data.feedback?.diagnosis_rating}
            ".
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {DIAGNOSIS_RATINGS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRating(r.value)}
                  className={[
                    "min-h-11 rounded-xl border px-4 text-sm font-medium",
                    rating === r.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted",
                  ].join(" ")}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Anything else you noticed? (optional)"
              className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm"
            />
            <button
              onClick={saveFeedback}
              disabled={savingFeedback}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {savingFeedback && <Loader2 className="h-4 w-4 animate-spin" />}
              Send feedback
            </button>
          </>
        )}
      </div>

      {(hasFeedback || showOutcome) && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {hasOutcome ? "Treatment outcome recorded" : "Treatment outcome not reported yet"}
          </p>
          <h2 className="mt-1 flex items-center gap-2 font-display text-lg font-bold">
            <Sprout className="h-5 w-5 text-primary" /> How did the recommended treatment work?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No hurry — come back after a few days and tell us what happened.
          </p>
          {!hasOutcome && notTried && (
            <p className="mt-4 rounded-xl bg-muted p-3 text-sm">
              That's fine. Open this report again after you try the treatment and tell us how it went.
              <button
                onClick={() => setNotTried(false)}
                className="ml-2 font-medium text-primary hover:underline"
              >
                Report now
              </button>
            </p>
          )}

          {hasOutcome ? (
            <>
              <p className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Recorded:{" "}
                {OUTCOMES.find((o) => o.value === data.outcome?.outcome)?.label ??
                  data.outcome?.outcome}
                {data.case?.promoted_at
                  ? " — this case now helps other farmers with the same crop."
                  : ""}
              </p>
              {followupUrl ? (
                <img
                  src={followupUrl}
                  alt="Your crop after treatment"
                  className="mt-3 h-32 w-32 rounded-xl object-cover"
                />
              ) : hasFollowup ? (
                <p className="mt-2 text-sm text-muted-foreground">Follow-up photo saved.</p>
              ) : (
                <div>
                  <PhotoPicker photo={photo} onPick={pickPhoto} onRemove={() => setPhoto(null)} />
                  {photo && (
                    <button
                      onClick={() => outcomeId && uploadPhoto(outcomeId)}
                      disabled={uploading}
                      className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Upload photo
                    </button>
                  )}
                </div>
              )}
            </>
          ) : notTried ? null : (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                {OUTCOMES.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setOutcome(o.value)}
                    className={[
                      "min-h-11 rounded-xl border px-4 text-sm font-medium",
                      outcome === o.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:bg-muted",
                    ].join(" ")}
                  >
                    {o.label}
                  </button>
                ))}
                <button
                  onClick={() => setNotTried(true)}
                  className="min-h-11 rounded-xl border border-dashed border-border px-4 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  I haven't tried it yet
                </button>
              </div>


              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={treatmentFollowed}
                  onChange={(e) => setTreatmentFollowed(e.target.checked)}
                  className="h-4 w-4"
                />
                I followed the recommended treatment
              </label>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input
                  value={days}
                  onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  placeholder="Days since treatment"
                  className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm"
                />
                <input
                  value={confirmedDisease}
                  onChange={(e) => setConfirmedDisease(e.target.value)}
                  placeholder="Actual disease, if different"
                  className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm"
                />
              </div>
              <textarea
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                rows={2}
                placeholder="Notes (optional)"
                className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm"
              />
              <PhotoPicker photo={photo} onPick={pickPhoto} onRemove={() => setPhoto(null)} />
              <button
                onClick={saveOutcome}
                disabled={savingOutcome}
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {savingOutcome && <Loader2 className="h-4 w-4 animate-spin" />}
                Save outcome
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
