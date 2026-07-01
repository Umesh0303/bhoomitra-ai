import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { FarmForm } from "@/components/farms/FarmForm";
import { createFarm, type FarmFormValues } from "@/lib/farms";

export const Route = createFileRoute("/_authenticated/app/farms/new")({
  head: () => ({ meta: [{ title: "Add Farm — Bhoomitra AI" }] }),
  component: NewFarmPage,
});

function NewFarmPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (v: FarmFormValues) => createFarm(v),
    onSuccess: (farm) => {
      toast.success("Farm added");
      qc.invalidateQueries({ queryKey: ["farms"] });
      navigate({ to: "/app/farms/$farmId", params: { farmId: farm.id } });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/app/farms" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to farms
      </Link>
      <header>
        <h1 className="font-display text-2xl font-bold">Add a new farm</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your farm details. You'll be able to update these anytime.
        </p>
      </header>
      <FarmForm submitLabel="Save farm" onSubmit={async (v) => { await mutation.mutateAsync(v); }} />
    </div>
  );
}
