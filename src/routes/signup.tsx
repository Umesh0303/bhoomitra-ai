import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthShell, AuthInput, GoogleButton, useFakeAuthSubmit } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — Bhoomitra AI" },
      { name: "description", content: "Create your Bhoomitra AI account." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { loading, submit } = useFakeAuthSubmit();
  return (
    <AuthShell mode="signup">
      <form onSubmit={submit} className="mt-8 space-y-4">
        <AuthInput label="Full Name" id="name" placeholder="Jane Farmer" required autoComplete="name" />
        <AuthInput label="Email" id="email" type="email" placeholder="you@email.com" required autoComplete="email" />
        <AuthInput label="Phone Number" id="phone" type="tel" placeholder="+91 00000 00000" />
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthInput label="Password" id="password" type="password" placeholder="••••••••" required autoComplete="new-password" />
          <AuthInput label="Confirm Password" id="confirm" type="password" placeholder="••••••••" required autoComplete="new-password" />
        </div>
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input type="checkbox" required className="mt-0.5 h-4 w-4 rounded border-input accent-primary" />
          <span>
            I agree to the{" "}
            <a href="#" className="font-medium text-primary hover:underline">Terms</a> and{" "}
            <a href="#" className="font-medium text-primary hover:underline">Privacy Policy</a>.
          </span>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>

        <div className="relative my-2 text-center text-xs text-muted-foreground">
          <span className="bg-background px-2 relative z-10">or continue with</span>
          <span className="absolute inset-x-0 top-1/2 -z-0 h-px bg-border" />
        </div>
        <GoogleButton label="Sign up with Google" />

        <p className="pt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">Log in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
