import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthShell, AuthInput } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Bhoomitra AI" },
      { name: "description", content: "Log in to your Bhoomitra AI account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <AuthShell mode="login">
      <div className="mt-8 space-y-4">
        <GoogleButton label="Continue with Google" />

        <div className="relative my-2 text-center text-xs text-muted-foreground">
          <span className="relative z-10 bg-background px-2">or with email</span>
          <span className="absolute inset-x-0 top-1/2 -z-0 h-px bg-border" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            toast.info("Email sign-in is coming soon", {
              description: "For now, please continue with Google.",
            });
          }}
          className="space-y-4"
        >
          <AuthInput label="Email" id="email" type="email" placeholder="you@email.com" autoComplete="email" />
          <AuthInput label="Password" id="password" type="password" placeholder="••••••••" autoComplete="current-password" />
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" />
              Remember me
            </label>
            <a href="#" className="font-medium text-primary hover:underline">Forgot password?</a>
          </div>
          <button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
          >
            Log in
          </button>
        </form>

        <p className="pt-4 text-center text-sm text-muted-foreground">
          New to Bhoomitra AI?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
