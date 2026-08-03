import { Suspense, lazy, type ComponentProps } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import type { VoiceControls } from "./VoiceControls";
import type { VoicePlayer } from "./VoicePlayer";
import type { VoiceSettingsSheet } from "./VoiceSettingsSheet";

// All voice UI is code-split and mounted only after hydration, so nothing
// browser-only is imported during SSR and initial page load is unaffected.

const ControlsImpl = lazy(() =>
  import("./VoiceControls").then((m) => ({ default: m.VoiceControls })),
);
const PlayerImpl = lazy(() => import("./VoicePlayer").then((m) => ({ default: m.VoicePlayer })));
const SettingsImpl = lazy(() =>
  import("./VoiceSettingsSheet").then((m) => ({ default: m.VoiceSettingsSheet })),
);

export function LazyVoiceControls(props: ComponentProps<typeof VoiceControls>) {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return (
    <Suspense fallback={<div className="h-11 w-11" />}>
      <ControlsImpl {...props} />
    </Suspense>
  );
}

export function LazyVoicePlayer(props: ComponentProps<typeof VoicePlayer>) {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return (
    <Suspense fallback={null}>
      <PlayerImpl {...props} />
    </Suspense>
  );
}

export function LazyVoiceSettingsSheet(props: ComponentProps<typeof VoiceSettingsSheet>) {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="h-11 w-11" />;
  return (
    <Suspense fallback={<div className="h-11 w-11" />}>
      <SettingsImpl {...props} />
    </Suspense>
  );
}
