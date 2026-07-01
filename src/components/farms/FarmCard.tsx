import { Link } from "@tanstack/react-router";
import { MapPin, Sprout, Layers, Calendar, Eye, Pencil, Trash2 } from "lucide-react";
import { FarmImage } from "./FarmImage";
import { formatArea, type FarmWithRelations } from "@/lib/farms";

export function FarmCard({
  farm,
  onDelete,
}: {
  farm: FarmWithRelations;
  onDelete: (farm: FarmWithRelations) => void;
}) {
  const cover = farm.farm_images[0]?.image_url;
  const created = new Date(farm.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:shadow-card">
      <FarmImage path={cover} alt={farm.farm_name} className="h-40 w-full object-cover" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold">{farm.farm_name}</h3>
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
            {farm.farm_type || "Farm"}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {farm.village}, {farm.district}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Field icon={Layers} label="Area" value={formatArea(farm.total_area, farm.area_unit)} />
          <Field icon={Sprout} label="Soil" value={farm.soil_type || "—"} />
          <Field icon={Sprout} label="Current crop" value={farm.current_crop || "—"} />
          <Field icon={Calendar} label="Added" value={created} />
        </dl>
        <div className="mt-5 flex gap-2 pt-2">
          <Link
            to="/app/farms/$farmId"
            params={{ farmId: farm.id }}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2 text-sm font-medium hover:bg-muted"
          >
            <Eye className="h-3.5 w-3.5" /> View
          </Link>
          <Link
            to="/app/farms/$farmId/edit"
            params={{ farmId: farm.id }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={() => onDelete(farm)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
