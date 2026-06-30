import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { PublicLayout } from "@/components/site/PublicLayout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Bhoomitra AI" },
      {
        name: "description",
        content: "Get in touch with the Bhoomitra AI team. We'd love to hear from you.",
      },
      { property: "og:title", content: "Contact Bhoomitra AI" },
      { property: "og:description", content: "Reach our team — we're here to help." },
    ],
  }),
  component: ContactPage,
});

const faqs = [
  {
    q: "When will AI features launch?",
    a: "We're rolling out AI modules gradually. The current foundation focuses on a reliable, scalable base.",
  },
  {
    q: "Is Bhoomitra AI free to use?",
    a: "Pricing details will be announced as features roll out. Early users will receive priority access.",
  },
  {
    q: "Do you support multiple languages?",
    a: "Multi-language support is on our roadmap to ensure access for farmers everywhere.",
  },
  {
    q: "How is my farm data handled?",
    a: "Your data belongs to you. We will never share it without consent.",
  },
];

function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <PublicLayout>
      <section className="container-page py-16 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
            Contact
          </span>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
            We'd love to hear from you
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Questions, feedback, partnership ideas — drop us a line and we'll respond shortly.
          </p>
        </div>
      </section>

      <section className="container-page grid gap-8 pb-16 lg:grid-cols-[1.2fr_1fr]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
          className="rounded-2xl border border-border bg-card p-8 shadow-soft"
        >
          <h2 className="font-display text-xl font-semibold">Send a message</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Full Name" id="name" placeholder="Your name" required />
            <Field label="Email" id="email" type="email" placeholder="you@email.com" required />
          </div>
          <Field className="mt-4" label="Subject" id="subject" placeholder="How can we help?" required />
          <div className="mt-4">
            <label htmlFor="message" className="text-sm font-medium">Message</label>
            <textarea
              id="message"
              required
              rows={5}
              className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none ring-ring/30 transition focus:ring-2"
              placeholder="Tell us a bit more…"
            />
          </div>
          <button
            type="submit"
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
          >
            <Send className="h-4 w-4" /> Send message
          </button>
          {sent && (
            <p className="mt-4 rounded-lg bg-primary-soft px-4 py-3 text-sm text-primary">
              Thanks — your message has been queued. We'll be in touch soon.
            </p>
          )}
        </form>

        <div className="space-y-4">
          <InfoCard icon={Mail} title="Email" body="hello@bhoomitra.ai" />
          <InfoCard icon={Phone} title="Phone" body="+91 00000 00000" />
          <InfoCard icon={MapPin} title="Office" body="Bengaluru, India" />
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <div className="grid h-56 place-items-center bg-muted text-sm text-muted-foreground">
              Google Maps Placeholder
            </div>
          </div>
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">FAQ</span>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Common questions</h2>
        </div>
        <div className="mx-auto grid max-w-3xl gap-3">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-border bg-card p-5 shadow-soft open:shadow-card"
            >
              <summary className="cursor-pointer list-none font-medium">
                <span className="flex items-center justify-between gap-4">
                  {f.q}
                  <span className="text-primary transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}

function Field({
  label,
  id,
  type = "text",
  placeholder,
  required,
  className,
}: {
  label: string;
  id: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        required={required}
        className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none ring-ring/30 transition focus:ring-2"
      />
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{body}</div>
      </div>
    </div>
  );
}
