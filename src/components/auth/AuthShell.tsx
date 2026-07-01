import { Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";
import type { ReactNode } from "react";

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
