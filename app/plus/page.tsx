import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Minus, Sparkles } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { entitlementOf, PLAN_LABEL } from "@/lib/entitlements";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "Membership",
  description:
    "The full read on every story: a deep analysis, three Prelims traps, a Mains skeleton and the keywords worth carrying. Built for UPSC and state PSC aspirants.",
  alternates: { canonical: "/plus" },
  openGraph: {
    url: `${SITE.url}/plus`,
    title: "Membership · The Bureaucracy",
    description: "The wire stays free. The revision layer is what you pay for.",
  },
};

interface PlanCard {
  id: "free" | "plus" | "mains";
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  highlight?: boolean;
  features: [string, boolean][];
}

const PLANS: PlanCard[] = [
  {
    id: "free" as const,
    name: "Free",
    price: "₹0",
    cadence: "forever",
    blurb: "Build the habit before you pay for anything.",
    features: [
      ["The 24-hour wire", true],
      ["The daily five and your streak", true],
      ["The 7am email brief", true],
      ["The full read on a story", false],
      ["Archive beyond 24 hours", false],
      ["Revision queue and compendium", false],
    ],
  },
  {
    id: "plus" as const,
    name: "Plus",
    price: "₹149",
    cadence: "per month · ₹999 a year",
    blurb: "For the reader who wants the angle, not just the update.",
    highlight: true,
    features: [
      ["Everything in Free", true],
      ["The full read on every story", true],
      ["Three Prelims traps per story", true],
      ["Mains skeleton and keywords", true],
      ["Archive beyond 24 hours", true],
      ["Revision queue across devices", true],
      ["Monthly compendium PDF", true],
    ],
  },
  {
    id: "mains" as const,
    name: "Mains",
    price: "₹399",
    cadence: "per month · ₹2,999 a year",
    blurb: "For the answer-writing stretch, where the marks actually are.",
    features: [
      ["Everything in Plus", true],
      ["Weekly prelims test with percentile", true],
      ["Answer-writing evaluation", true],
      ["Monthly mentor call", true],
      ["Optional-subject deep dives", true],
      ["Priority support", true],
    ],
  },
];

export default async function PlusPage() {
  const user = await getSessionUser();
  const entitlement = entitlementOf(
    user
      ? {
          plan: user.plan,
          planExpiresAt: user.planExpiresAt,
          planSource: user.planSource,
          role: user.role,
        }
      : null,
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-primary">
        <Sparkles className="size-3.5" /> Membership
      </div>
      <h1 className="mt-3 max-w-3xl font-display text-4xl leading-[1.03] tracking-[-0.03em] sm:text-6xl">
        Read the story.
        <br />
        Then read what it means.
      </h1>
      <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
        Every story on the wire stays free. Members get the layer underneath it: a deeper read,
        three Prelims traps with the reasoning, and a Mains skeleton you can write from — generated
        once per story and cached, never improvised on the page.
      </p>

      {user ? (
        <p className="mt-4 inline-flex items-center gap-2 border border-border bg-card px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
          Signed in as {user.email || user.name} · current plan{" "}
          <span className="text-primary">{PLAN_LABEL[entitlement.plan]}</span>
        </p>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => {
          const current = entitlement.plan === plan.id;
          return (
            <section
              key={plan.id}
              className={`flex flex-col border bg-card ${
                plan.highlight ? "border-primary/60" : "border-border"
              }`}
            >
              <div className="border-b border-border px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-mono text-[9px] uppercase tracking-[0.18em]">{plan.name}</h2>
                  {current ? (
                    <span className="bg-primary/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-primary">
                      Your plan
                    </span>
                  ) : plan.highlight ? (
                    <span className="bg-primary px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-primary-foreground">
                      Recommended
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 font-display text-3xl leading-none tracking-[-0.02em]">{plan.price}</p>
                <p className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                  {plan.cadence}
                </p>
              </div>

              <div className="flex flex-1 flex-col px-4 py-4">
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">{plan.blurb}</p>
                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.map(([label, included]) => (
                    <li
                      key={String(label)}
                      className={`flex items-start gap-2 text-[12px] leading-relaxed ${
                        included ? "text-foreground/85" : "text-muted-foreground/60"
                      }`}
                    >
                      {included ? (
                        <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      ) : (
                        <Minus className="mt-0.5 size-3.5 shrink-0" />
                      )}
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })}
      </div>

      <section className="mt-8 border border-border bg-card px-4 py-5">
        <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-primary">Billing</p>
        <h2 className="mt-2 font-display text-2xl leading-tight tracking-[-0.02em]">
          Paid inside the app. No redirect, no auto-renew.
        </h2>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
          Membership is bought in the iOS and Android app: Razorpay&apos;s native sheet opens over the
          paywall for UPI, cards and net banking, and the server checks the payment before it unlocks
          anything. Web checkout is not open yet — until it is, readers who mostly use the web can
          request founding access and keep the founding price. Write from the address you sign in
          with and mention the phone or web account you use.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <a
            href={`mailto:${SITE.editor.email}?subject=${encodeURIComponent("Founding access to The Bureaucracy")}`}
            className="inline-flex items-center gap-1.5 border border-primary bg-primary px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-primary-foreground hover:bg-primary/90"
          >
            Request founding access <ArrowRight className="size-3" />
          </a>
          <Link
            href="/subscribe"
            className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground hover:text-primary"
          >
            Or start with the free morning brief →
          </Link>
        </div>
        <p className="mt-3 font-mono text-[8px] uppercase leading-relaxed tracking-[0.08em] text-muted-foreground">
          Each payment covers one period. Nothing is stored on a card and nothing renews by itself.
        </p>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          [
            "Gated on the server",
            "A free account never receives the paid text. There is no blur to inspect in the client.",
          ],
          [
            "Written once, cached",
            "Groq writes the pack at most once per story. The same story is not billed to you twice.",
          ],
          [
            "Grounded, not generic",
            "The prompt forbids invented numbers and names. Thin excerpts produce careful analysis, not filler.",
          ],
        ].map(([title, body]) => (
          <div key={title} className="border border-border bg-card p-3">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-primary">{title}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      <p className="mt-8 font-mono text-[8.5px] uppercase leading-relaxed tracking-[0.1em] text-muted-foreground">
        The news stays free.{" "}
        <Link href="/" className="text-primary hover:underline">
          Read today&apos;s 24 hours →
        </Link>
      </p>
    </main>
  );
}
