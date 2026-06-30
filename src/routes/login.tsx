import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthShell, AuthInput, GoogleButton, useFakeAuthSubmit } from "@/components/auth/AuthShell";

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
  const { loading, submit } = useFakeAuthSubmit();

  return (
    <AuthShell mode="login">
      <form onSubmit={submit} className="mt-8 space-y-4">
        <AuthInput label="Email" id="email" type="email" placeholder="you@email.com" required autoComplete="email" />
        <AuthInput label="Password" id="password" type="password" placeholder="••••••••" required autoComplete="current-password" />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" />
            Remember me
          </label>
          <a href="#" className="font-medium text-primary hover:underline">Forgot password?</a>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Log in"}
        </button>

        <div className="relative my-2 text-center text-xs text-muted-foreground">
          <span className="bg-background px-2 relative z-10">or continue with</span>
          <span className="absolute inset-x-0 top-1/2 -z-0 h-px bg-border" />
        </div>
        <GoogleButton label="Continue with Google" />

        <p className="pt-4 text-center text-sm text-muted-foreground">
          New to Bhoomitra AI?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">Create an account</Link>
        </p>
      </form>
    </AuthShell>
  );
}
