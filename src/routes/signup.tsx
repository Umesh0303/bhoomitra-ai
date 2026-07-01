import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthShell, AuthInput } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { toast } from "sonner";

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
  return (
    <AuthShell mode="signup">
      <div className="mt-8 space-y-4">
        <GoogleButton label="Sign up with Google" />

        <div className="relative my-2 text-center text-xs text-muted-foreground">
          <span className="relative z-10 bg-background px-2">or with email</span>
          <span className="absolute inset-x-0 top-1/2 -z-0 h-px bg-border" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            toast.info("Email sign-up is coming soon", {
              description: "For now, please continue with Google.",
            });
          }}
          className="space-y-4"
        >
          <AuthInput label="Full name" id="name" placeholder="Jane Farmer" autoComplete="name" />
          <AuthInput label="Email" id="email" type="email" placeholder="you@email.com" autoComplete="email" />
          <AuthInput label="Password" id="password" type="password" placeholder="••••••••" autoComplete="new-password" />
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-input accent-primary" />
            <span>
              I agree to the{" "}
              <a href="#" className="font-medium text-primary hover:underline">Terms</a> and{" "}
              <a href="#" className="font-medium text-primary hover:underline">Privacy Policy</a>.
            </span>
          </label>
          <button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
          >
            Create account
          </button>
        </form>

        <p className="pt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
