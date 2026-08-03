import { useEffect, useState } from "react";

type Props = {
  level: number;
  active: boolean;
};

/** Lightweight waveform. Respects prefers-reduced-motion. */
export function VoiceVisualizer({ level, active }: Props) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const bars = [0.5, 0.8, 1, 0.75, 0.45];

  return (
    <div className="flex h-6 items-end gap-[3px]" aria-hidden="true">
      {bars.map((factor, i) => {
        const height = reduced
          ? 8
          : Math.max(4, Math.min(24, 4 + level * 40 * factor + (active ? 3 : 0)));
        return (
          <span
            key={i}
            className="w-[3px] rounded-full bg-primary transition-[height] duration-100"
            style={{ height: `${height}px`, opacity: active ? 1 : 0.4 }}
          />
        );
      })}
    </div>
  );
}
