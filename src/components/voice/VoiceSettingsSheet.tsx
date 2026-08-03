import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VOICE_LANGUAGES, type VoiceSettings, type VoiceSupport } from "@/types/voice";
import { trackVoiceEvent } from "@/lib/voice/analytics";

type Props = {
  settings: VoiceSettings;
  onChange: (patch: Partial<VoiceSettings>) => void;
  support: VoiceSupport;
};

export function VoiceSettingsSheet({ settings, onChange, support }: Props) {
  const [voices, setVoices] = useState<Array<{ name: string; lang: string }>>([]);

  useEffect(() => {
    if (!support.synthesis) return;
    let cancelled = false;
    const load = async () => {
      const { getSynthesisProvider } = await import("@/lib/voice/speech-synthesis");
      const list = getSynthesisProvider().listVoices();
      if (!cancelled) setVoices(list);
    };
    void load();
    window.speechSynthesis?.addEventListener?.("voiceschanged", load);
    return () => {
      cancelled = true;
      window.speechSynthesis?.removeEventListener?.("voiceschanged", load);
    };
  }, [support.synthesis]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label="Voice settings"
          title="Voice settings"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Voice settings</SheetTitle>
          <SheetDescription>
            Control how Bhoomitra AI listens and speaks. Audio is never recorded or stored.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Row label="Enable voice" hint="Turn the microphone and spoken replies on or off.">
            <Switch
              checked={settings.enabled}
              onCheckedChange={(v) => {
                if (!v) trackVoiceEvent("voice_disabled");
                onChange({ enabled: v });
              }}
              aria-label="Enable voice"
            />
          </Row>

          <Row label="Auto-play replies" hint="Read each finished answer aloud automatically.">
            <Switch
              checked={settings.autoPlay}
              disabled={!settings.enabled || !support.synthesis}
              onCheckedChange={(v) => onChange({ autoPlay: v })}
              aria-label="Auto-play replies"
            />
          </Row>

          <div className="space-y-2">
            <Label>Language</Label>
            <Select
              value={settings.preferredLanguage}
              onValueChange={(v) => onChange({ preferredLanguage: v })}
            >
              <SelectTrigger aria-label="Preferred language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICE_LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.label} · {l.nativeLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Voice</Label>
            <Select
              value={settings.voiceName ?? "auto"}
              onValueChange={(v) => onChange({ voiceName: v === "auto" ? null : v })}
            >
              <SelectTrigger aria-label="Speaking voice">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automatic (best match)</SelectItem>
                {voices.map((v) => (
                  <SelectItem key={`${v.name}-${v.lang}`} value={v.name}>
                    {v.name} ({v.lang})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Speech rate · {settings.speechRate.toFixed(1)}x</Label>
            <Slider
              value={[settings.speechRate]}
              min={0.5}
              max={2}
              step={0.1}
              onValueChange={([v]) => onChange({ speechRate: v })}
              aria-label="Speech rate"
            />
          </div>

          <div className="space-y-2">
            <Label>Pitch · {settings.speechPitch.toFixed(1)}</Label>
            <Slider
              value={[settings.speechPitch]}
              min={0.5}
              max={2}
              step={0.1}
              onValueChange={([v]) => onChange({ speechPitch: v })}
              aria-label="Speech pitch"
            />
          </div>

          {(!support.recognition || !support.synthesis) && (
            <p className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              {!support.recognition && "Voice input isn't available in this browser. "}
              {!support.synthesis && "Spoken replies aren't available in this browser. "}
              Chrome or Edge give the best experience. Text chat always works.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label className="text-sm">{label}</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  );
}
