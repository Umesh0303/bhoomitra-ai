import { Camera, Check } from "lucide-react";
import { CAMERA_TIPS } from "../types";

export function CameraGuidance() {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Camera className="h-4 w-4 text-primary" />
        Tips for best results
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {CAMERA_TIPS.map((tip) => (
          <li key={tip} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
