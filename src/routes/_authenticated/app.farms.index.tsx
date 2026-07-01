import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Sprout, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FarmCard } from "@/components/farms/FarmCard";
import {
  listFarms,
  softDeleteFarm,
  type FarmWithRelations,
} from "@/lib/farms";

export const Route = createFileRoute("/_authenticated/app/farms/")({
  head: () => ({ meta: [{ title: "My Farms — Bhoomitra AI" }] }),
  component: FarmsListPage,
});

function FarmsListPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: farms = [], isLoading } = useQuery({
    queryKey: ["farms"],
    queryFn: listFarms,
  });
  const [pendingDelete, setPendingDelete] = useState<FarmWithRelations | null>(null);

  const del = useMutation({
    mutationFn: softDeleteFarm,
    onSuccess: () => {
      toast.success("Farm deleted");
      qc.invalidateQueries({ queryKey: ["farms"] });
      setPendingDelete(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">My Farms</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your farm profiles. AI-driven insights coming soon.
          </p>
        </div>
        <Link
          to="/app/farms/new"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add Farm
        </Link>
      </header>

      {isLoading ? (
        <div className="grid place-items-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : farms.length === 0 ? (
        <EmptyState onAdd={() => navigate({ to: "/app/farms/new" })} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {farms.map((f) => (
            <FarmCard key={f.id} farm={f} onDelete={setPendingDelete} />
          ))}
        </div>
      )}

      {pendingDelete && (
        <ConfirmDelete
          name={pendingDelete.farm_name}
          loading={del.isPending}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => del.mutate(pendingDelete.id)}
        />
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 p-14 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Sprout className="h-8 w-8" />
      </span>
      <h3 className="mt-5 font-display text-xl font-semibold">No farms added yet</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Start by adding your first farm to receive personalized AI farming recommendations in
        future updates.
      </p>
      <button
        onClick={onAdd}
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" /> Add Your First Farm
      </button>
    </div>
  );
}

function ConfirmDelete({
  name,
  loading,
  onCancel,
  onConfirm,
}: {
  name: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-card">
        <h3 className="font-display text-lg font-semibold">Delete this farm?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Are you sure you want to delete <span className="font-medium text-foreground">{name}</span>?
          This will hide it from your dashboard.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-70"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
