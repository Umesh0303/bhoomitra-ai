import { createFileRoute, Link } from "@tanstack/react-router";
import { Lightbulb, Leaf, ShieldCheck, Users, ArrowRight } from "lucide-react";
import { PublicLayout } from "@/components/site/PublicLayout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Bhoomitra AI" },
      {
        name: "description",
        content:
          "Learn about Bhoomitra AI's mission to empower farmers with intelligent, sustainable, farmer-first technology.",
      },
      { property: "og:title", content: "About Bhoomitra AI" },
      {
        property: "og:description",
        content: "Our mission, vision, and the story behind Bhoomitra AI.",
      },
    ],
  }),
  component: AboutPage,
});

const values = [
  { icon: Lightbulb, title: "Innovation", desc: "Bringing modern AI to one of the world's oldest professions." },
  { icon: Leaf, title: "Sustainability", desc: "Practices that protect soil, water, and the next generation." },
  { icon: ShieldCheck, title: "Trust", desc: "Transparent, accurate, and respectful of farmer data." },
  { icon: Users, title: "Farmer First", desc: "Every decision starts with the farmer's reality." },
];

function AboutPage() {
  return (
    <PublicLayout>
      <section className="container-page py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
            About Bhoomitra AI
          </span>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Technology that works in the field, not just on a screen
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            We're building the calm, intelligent farming platform that farmers
            actually deserve — beautifully simple, deeply useful.
          </p>
        </div>
      </section>

      <section className="container-page grid gap-6 pb-16 md:grid-cols-2">
        {[
          {
            title: "Our Mission",
            body: "To empower every farmer with intelligent tools that improve productivity while protecting the planet.",
          },
          {
            title: "Our Vision",
            body: "A world where data-driven, sustainable agriculture is accessible to farms of every size.",
          },
          {
            title: "Our Story",
            body: "Bhoomitra AI started with a simple observation — farmers carry incredible knowledge, but rarely have software designed for them. We're closing that gap.",
          },
          {
            title: "Why We Built It",
            body: "Climate, markets, and inputs all change faster than ever. Farmers deserve a partner that turns information into clarity.",
          },
        ].map((b) => (
          <div key={b.title} className="rounded-2xl border border-border bg-card p-7 shadow-soft">
            <h2 className="font-display text-xl font-semibold">{b.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
          </div>
        ))}
      </section>

      <section className="container-page py-16">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
            Core Values
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            What guides every decision we make
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div key={v.title} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                <v.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-base font-semibold">{v.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="overflow-hidden rounded-3xl border border-border bg-card p-10 text-center shadow-card sm:p-14">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Join us early
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            Create an account and shape the future of intelligent farming with us.
          </p>
          <Link
            to="/signup"
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
          >
            Create Account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
