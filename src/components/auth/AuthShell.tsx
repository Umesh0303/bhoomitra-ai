import { Link, useNavigate } from "@tanstack/react-router";
import { Leaf } from "lucide-react";
import type { ReactNode } from "react";
import { useState, type FormEvent } from "react";
import { setUser } from "@/lib/auth";

export function AuthShell({
  mode,
  children,
}: {
  mode: "login" | "signup";
  children?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-foreground/15">
            <Leaf className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold">Bhoomitra AI</span>
        </Link>
        <div>
          <h2 className="max-w-md font-display text-4xl font-bold leading-tight">
            Smart Farming for a Sustainable Future.
          </h2>
          <p className="mt-4 max-w-md text-primary-foreground/85">
            Join early and help shape an AI-powered platform built around the
            farmer's reality.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/70">
          © {new Date().getFullYear()} Bhoomitra AI
        </p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-bold">Bhoomitra AI</span>
          </Link>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "login"
              ? "Log in to continue to your dashboard."
              : "It only takes a minute to get started."}
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function AuthInput({
  label,
  id,
  type = "text",
  placeholder,
  required,
  autoComplete,
}: {
  label: string;
  id: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none ring-ring/30 transition focus:ring-2"
      />
    </div>
  );
}

export function GoogleButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-input bg-card text-sm font-medium text-foreground transition-colors hover:bg-muted"
    >
      <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.2 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.2 29 4.5 24 4.5 16.3 4.5 9.6 8.9 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.7 13-4.6l-6-5c-1.9 1.3-4.3 2.1-7 2.1-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.4 39 16.1 43.5 24 43.5z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.8-3.7 5l6 5C42.1 35 43.5 30 43.5 24c0-1.2-.1-2.4-.4-3.5z" />
      </svg>
      {label}
    </button>
  );
}

export function useFakeAuthSubmit() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  return {
    loading,
    submit: (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setLoading(true);
      const form = new FormData(e.currentTarget);
      const email = String(form.get("email") || "farmer@example.com");
      const name = String(form.get("name") || email.split("@")[0]);
      setUser({ name, email });
      setTimeout(() => navigate({ to: "/app/dashboard" }), 300);
    },
  };
}
