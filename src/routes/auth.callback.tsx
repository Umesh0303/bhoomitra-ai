import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Leaf, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing you in — Bhoomitra AI" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      // Session is typically set by the OAuth broker before we land here.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        toast.success("Welcome back!");
        navigate({ to: "/app/dashboard", replace: true });
        return;
      }
      // Fall back: subscribe briefly for the SIGNED_IN event.
      const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
        if (event === "SIGNED_IN" && s) {
          sub.subscription.unsubscribe();
          toast.success("Welcome back!");
          navigate({ to: "/app/dashboard", replace: true });
        }
      });
      // Timeout guard
      setTimeout(() => {
        sub.subscription.unsubscribe();
        if (!cancelled) {
          toast.error("Sign-in did not complete. Please try again.");
          navigate({ to: "/login", replace: true });
        }
      }, 6000);
    }
    finish();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Leaf className="h-7 w-7" />
        </div>
        <h1 className="mt-6 font-display text-xl font-semibold">Signing you in…</h1>
        <p className="mt-2 text-sm text-muted-foreground">Securely finalising your session.</p>
        <div className="mt-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </div>
    </div>
  );
}
