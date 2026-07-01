import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Upload, X } from "lucide-react";
import {
  AREA_UNITS,
  CROP_SUGGESTIONS,
  FARM_TYPES,
  INDIAN_STATES,
  IRRIGATION_METHODS,
  SOIL_TYPES,
  WATER_SOURCES,
  type FarmFormValues,
  type FarmWithRelations,
} from "@/lib/farms";

const schema = z.object({
  farm_name: z.string().trim().min(1, "Farm name is required").max(100),
  farm_type: z.string().optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  state: z.string().trim().min(1, "State is required").max(80),
  district: z.string().trim().min(1, "District is required").max(80),
  village: z.string().trim().min(1, "Village is required").max(80),
  pincode: z.string().max(10).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  total_area: z.coerce.number().positive("Enter a positive area"),
  area_unit: z.enum(AREA_UNITS),
  soil_type: z.string().optional().nullable(),
  irrigation_method: z.string().optional().nullable(),
  current_crop: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  water_sources: z.array(z.string()),
});

type FormShape = z.infer<typeof schema>;

export function FarmForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: FarmWithRelations | null;
  submitLabel: string;
  onSubmit: (values: FarmFormValues) => Promise<void>;
}) {
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormShape>({
    resolver: zodResolver(schema),
    defaultValues: {
      farm_name: initial?.farm_name ?? "",
      farm_type: initial?.farm_type ?? "",
      description: initial?.description ?? "",
      state: initial?.state ?? "",
      district: initial?.district ?? "",
      village: initial?.village ?? "",
      pincode: initial?.pincode ?? "",
      address: initial?.address ?? "",
      total_area: (initial?.total_area as unknown as number) ?? undefined,
      area_unit: (initial?.area_unit as (typeof AREA_UNITS)[number]) ?? "acres",
      soil_type: initial?.soil_type ?? "",
      irrigation_method: initial?.irrigation_method ?? "",
      current_crop: initial?.current_crop ?? "",
      notes: initial?.notes ?? "",
      water_sources: initial?.farm_water_sources.map((w) => w.water_source) ?? [],
    },
  });

  const selectedWater = watch("water_sources");

  const toggleWater = (v: string) => {
    const next = selectedWater.includes(v)
      ? selectedWater.filter((x) => x !== v)
      : [...selectedWater, v];
    setValue("water_sources", next, { shouldDirty: true });
  };

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 5 - images.length);
    setImages((prev) => [...prev, ...arr].slice(0, 5));
  };

  async function submit(values: FormShape) {
    setSubmitting(true);
    try {
      await onSubmit({ ...values, new_images: images });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-8">
      <Section title="Basic information">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Farm name" required error={errors.farm_name?.message}>
            <input {...register("farm_name")} className={inputCls} placeholder="e.g. Green Acres" />
          </Field>
          <Field label="Farm type">
            <select {...register("farm_type")} className={inputCls}>
              <option value="">Select type…</option>
              {FARM_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Description" className="md:col-span-2">
            <textarea
              {...register("description")}
              rows={3}
              className={inputCls}
              placeholder="Brief description of your farm…"
            />
          </Field>
        </div>
      </Section>

      <Section title="Location">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="State" required error={errors.state?.message}>
            <input {...register("state")} list="states" className={inputCls} placeholder="e.g. Karnataka" />
            <datalist id="states">
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="District" required error={errors.district?.message}>
            <input {...register("district")} className={inputCls} placeholder="e.g. Mysuru" />
          </Field>
          <Field label="Village" required error={errors.village?.message}>
            <input {...register("village")} className={inputCls} placeholder="e.g. Hunsur" />
          </Field>
          <Field label="Pincode">
            <input {...register("pincode")} className={inputCls} placeholder="e.g. 570001" />
          </Field>
          <Field label="Address" className="md:col-span-2">
            <input {...register("address")} className={inputCls} placeholder="Street / landmark (optional)" />
          </Field>
        </div>
      </Section>

      <Section title="Land details">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Total area" required error={errors.total_area?.message}>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                {...register("total_area")}
                className={`${inputCls} flex-1`}
                placeholder="e.g. 5.2"
              />
              <select {...register("area_unit")} className={`${inputCls} w-32`}>
                <option value="acres">Acres</option>
                <option value="hectares">Hectares</option>
                <option value="sqm">Sq. m</option>
              </select>
            </div>
          </Field>
          <Field label="Soil type">
            <select {...register("soil_type")} className={inputCls}>
              <option value="">Select soil…</option>
              {SOIL_TYPES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Irrigation method">
            <select {...register("irrigation_method")} className={inputCls}>
              <option value="">Select method…</option>
              {IRRIGATION_METHODS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Current crop">
            <input
              {...register("current_crop")}
              list="crops"
              className={inputCls}
              placeholder="e.g. Rice"
            />
            <datalist id="crops">
              {CROP_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Water sources" className="md:col-span-2">
            <div className="flex flex-wrap gap-2">
              {WATER_SOURCES.map((w) => {
                const active = selectedWater.includes(w);
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => toggleWater(w)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      </Section>

      <Section title="Farm images" subtitle="Upload up to 5 photos (JPG/PNG)">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground hover:bg-muted/50">
          <Upload className="h-5 w-5" />
          <span>Click to upload images</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addImages(e.target.files)}
          />
        </label>
        {images.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {images.map((f, i) => (
              <div key={i} className="relative overflow-hidden rounded-lg border border-border">
                <img
                  src={URL.createObjectURL(f)}
                  alt=""
                  className="h-24 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImages((p) => p.filter((_, x) => x !== i))}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 text-destructive shadow"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Notes">
        <textarea
          {...register("notes")}
          rows={4}
          className={inputCls}
          placeholder="Any additional information about your farm..."
        />
      </Section>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-4">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90 disabled:opacity-70"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <header className="mb-4">
        <h2 className="font-display text-base font-semibold">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  error,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-foreground/80">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
