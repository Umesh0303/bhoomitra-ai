import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FarmForm } from "@/components/farms/FarmForm";
import {
  deleteFarmImage,
  getFarm,
  signImages,
  updateFarm,
  type FarmFormValues,
  type FarmImage as FarmImageRow,
} from "@/lib/farms";

export const Route = createFileRoute("/_authenticated/app/farms/$farmId/edit")({
  head: () => ({ meta: [{ title: "Edit farm — Bhoomitra AI" }] }),
  component: EditFarmPage,
});

function EditFarmPage() {
  const { farmId } = useParams({ from: "/_authenticated/app/farms/$farmId/edit" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: farm, isLoading } = useQuery({
    queryKey: ["farm", farmId],
    queryFn: () => getFarm(farmId),
  });

  const mutation = useMutation({
    mutationFn: (v: FarmFormValues) => updateFarm(farmId, v),
    onSuccess: () => {
      toast.success("Farm updated");
      qc.invalidateQueries({ queryKey: ["farm", farmId] });
      qc.invalidateQueries({ queryKey: ["farms"] });
      navigate({ to: "/app/farms/$farmId", params: { farmId } });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!farm?.farm_images.length) return;
    signImages(farm.farm_images.map((i) => i.image_url)).then(setUrls);
  }, [farm]);

  const removeImage = useMutation({
    mutationFn: (img: FarmImageRow) => deleteFarmImage(img),
    onSuccess: () => {
      toast.success("Image removed");
      qc.invalidateQueries({ queryKey: ["farm", farmId] });
    },
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!farm) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-muted-foreground">Farm not found.</p>
        <Link to="/app/farms" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Back to farms
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/app/farms/$farmId" params={{ farmId }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to farm
      </Link>
      <header>
        <h1 className="font-display text-2xl font-bold">Edit farm</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update details for {farm.farm_name}.</p>
      </header>

      {farm.farm_images.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="mb-3 font-display text-base font-semibold">Existing images</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {farm.farm_images.map((img) => (
              <div key={img.id} className="relative overflow-hidden rounded-lg border border-border">
                {urls[img.image_url] ? (
                  <img src={urls[img.image_url]} alt="" className="h-24 w-full object-cover" />
                ) : (
                  <div className="h-24 w-full animate-pulse bg-muted" />
                )}
                <button
                  type="button"
                  onClick={() => removeImage.mutate(img)}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 text-destructive shadow"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <FarmForm
        initial={farm}
        submitLabel="Save changes"
        onSubmit={async (v) => { await mutation.mutateAsync(v); }}
      />
    </div>
  );
}
