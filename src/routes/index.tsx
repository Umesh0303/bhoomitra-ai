import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sprout,
  FlaskConical,
  Bug,
  CloudSun,
  LineChart,
  Bot,
  Brain,
  Clock,
  TrendingUp,
  ArrowRight,
  UserPlus,
  MapPin,
  Upload,
  Sparkles,
  Quote,
  Star,
  CheckCircle2,
} from "lucide-react";
import { PublicLayout } from "@/components/site/PublicLayout";
import heroImage from "@/assets/hero-farm.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bhoomitra AI — Smart Farming for a Sustainable Future" },
      {
        name: "description",
        content:
          "AI-powered farming platform helping farmers improve crop productivity with intelligent, sustainable recommendations.",
      },
      { property: "og:title", content: "Bhoomitra AI — Smart Farming for a Sustainable Future" },
      {
        property: "og:description",
        content: "AI-powered insights for modern, sustainable agriculture.",
      },
      { property: "og:image", content: heroImage },
    ],
  }),
  component: HomePage,
});

const features = [
  { icon: Sprout, title: "Crop Recommendation", desc: "Pick the right crop for your soil, climate, and season." },
  { icon: FlaskConical, title: "Soil Analysis", desc: "Understand soil health and nutrient balance at a glance." },
  { icon: Bug, title: "Disease Detection", desc: "Identify plant diseases early from a single photo." },
  { icon: CloudSun, title: "Weather Intelligence", desc: "Hyper-local forecasts tailored to your fields." },
  { icon: LineChart, title: "Market Insights", desc: "Track prices and demand to sell at the right time." },
  { icon: Bot, title: "AI Assistant", desc: "Ask anything about your farm — get clear answers." },
];

const whyUs = [
  { icon: Brain, title: "Smart Decisions", desc: "Data-backed guidance for every step of the season." },
  { icon: Clock, title: "Save Time", desc: "Spend less time on guesswork, more on what matters." },
  { icon: TrendingUp, title: "Increase Productivity", desc: "Higher yields with sustainable practices." },
];

const steps = [
  { icon: UserPlus, title: "Create Account", desc: "Sign up in seconds and set up your profile." },
  { icon: MapPin, title: "Add Farm", desc: "Tell us about your land, crops, and goals." },
  { icon: Upload, title: "Upload Data", desc: "Add soil, weather, or image inputs as you go." },
  { icon: Sparkles, title: "Receive AI Insights", desc: "Available in a future version." },
];

const testimonials = [
  {
    name: "Ramesh K.",
    role: "Paddy Farmer, Karnataka",
    text: "Bhoomitra AI feels designed for us — simple, clear, and built around how we actually work.",
  },
  {
    name: "Sunita P.",
    role: "Horticulturist, Maharashtra",
    text: "I'm excited for the AI features. The platform already feels reliable and easy to use.",
  },
  {
    name: "Arun M.",
    role: "Organic Farmer, Tamil Nadu",
    text: "Finally a farming tool that respects the farmer. Clean, modern, and to the point.",
  },
];

function HomePage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container-page grid gap-12 py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Version 1 — Foundation
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Smart Farming for a{" "}
              <span className="text-primary">Sustainable Future</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Bhoomitra AI brings intelligent recommendations, soil insights, and weather
              intelligence into one calm, easy-to-use platform built for farmers.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/about"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-card px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Learn More
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["Farmer-first design", "Sustainable practices", "Built to scale"].map((t) => (
                <span key={t} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-primary-soft/50 blur-2xl" />
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
              <img
                src={heroImage}
                alt="Illustration of a smart, AI-assisted farming landscape"
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <Section
        eyebrow="Features"
        title="Everything a modern farm needs"
        subtitle="A unified platform built for clarity. AI modules are arriving in upcoming versions."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="flex items-start justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <f.icon className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-highlight/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-highlight-foreground/80">
                  Coming Soon
                </span>
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* Why us */}
      <Section
        eyebrow="Why Bhoomitra AI"
        title="Built around how farmers actually work"
      >
        <div className="grid gap-5 md:grid-cols-3">
          {whyUs.map((w) => (
            <div
              key={w.title}
              className="rounded-2xl border border-border bg-card p-7 shadow-soft"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent">
                <w.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold">{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{w.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section eyebrow="How it works" title="A simple path to smarter farming">
        <ol className="grid gap-5 md:grid-cols-4">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <span className="absolute -top-3 left-6 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="mt-2 grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <s.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-base font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
              {i === 3 && (
                <span className="mt-3 inline-block rounded-full bg-highlight/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-highlight-foreground/80">
                  Future Version
                </span>
              )}
            </li>
          ))}
        </ol>
      </Section>

      {/* Testimonials */}
      <Section eyebrow="Testimonials" title="Loved by farmers, designed for the future">
        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-soft"
            >
              <Quote className="h-6 w-6 text-primary/60" />
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground">
                "{t.text}"
              </blockquote>
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <figcaption>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </figcaption>
                <div className="flex gap-0.5 text-highlight">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
              </div>
            </figure>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <section className="container-page pb-20">
        <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary to-primary/85 p-10 text-primary-foreground shadow-card sm:p-14">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Ready to grow smarter?
              </h2>
              <p className="mt-2 max-w-xl text-sm text-primary-foreground/85 sm:text-base">
                Create your free account today. Your farm, your data, your future — all in one place.
              </p>
            </div>
            <Link
              to="/signup"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-card px-6 text-sm font-semibold text-primary shadow-soft transition-colors hover:bg-card/90"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function Section({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="container-page py-16 sm:py-20">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
          {eyebrow}
        </span>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-3 text-base text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}
