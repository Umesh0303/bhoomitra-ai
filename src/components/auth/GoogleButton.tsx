import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { signInWithGoogle } from "@/services/authService";

type Props = {
  label?: string;
  className?: string;
};

export function GoogleButton({ label = "Continue with Google", className }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result?.error) {
        const msg =
          result.error instanceof Error ? result.error.message : String(result.error);
        toast.error("Google sign-in failed", { description: msg });
        setLoading(false);
        return;
      }
      // If redirected: browser navigates away.
      // If popup with tokens: onAuthStateChange handles session; keep loading briefly.
    } catch (e) {
      toast.error("Google sign-in failed", {
        description: e instanceof Error ? e.message : "Unexpected error",
      });
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label="Continue with Google"
      className={[
        "inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-input bg-card text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60 disabled:cursor-not-allowed",
        className ?? "",
      ].join(" ")}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.2 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.2 29 4.5 24 4.5 16.3 4.5 9.6 8.9 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.7 13-4.6l-6-5c-1.9 1.3-4.3 2.1-7 2.1-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.4 39 16.1 43.5 24 43.5z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.8-3.7 5l6 5C42.1 35 43.5 30 43.5 24c0-1.2-.1-2.4-.4-3.5z" />
        </svg>
      )}
      {loading ? "Signing you in…" : label}
    </button>
  );
}
