import type { Metadata } from "next";
import Link from "next/link";
import { NEWS_WINDOW_HOURS, SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "The terms of use for The Bureaucracy: what the service is, the rules for accounts and comments, moderation, ownership and liability.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "25 October 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="border-b border-border pb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-foreground">
        {title}
      </h2>
      <div className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="border-b-2 border-foreground pb-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Terms</p>
        <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.9rem]">
          The rules of the reading room.
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
          Short version: read freely, argue honestly, do not spam or impersonate anyone, and verify official
          notifications with the commission before you rely on them.
        </p>
        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          Last updated {UPDATED}
        </p>
      </div>

      <Section title="1. The service">
        <p>
          {SITE.name} collects public news from the last {NEWS_WINDOW_HOURS} hours, maps it to a civil-services
          syllabus, and ranks it. It is a reading aid. It is not a coaching product, a test series, an answer-writing service,
          or a substitute for the official notification, statute or judgment.
        </p>
        <p>
          The site is not affiliated with, endorsed by, or connected to the Union Public Service Commission, any
          state public service commission, or the Government of India.
        </p>
      </Section>

      <Section title="2. Using the site">
        <p>
          You may read without an account. By using the site you agree to these terms. If you do not agree, do
          not use it. You must be at least 18 years old to create an account or post a comment.
        </p>
        <p>
          We may change, suspend or withdraw any part of the site at any time. The 24-hour window is a product
          rule, not a guarantee that any particular story will appear or remain available.
        </p>
      </Section>

      <Section title="3. Accounts">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Give an address you control and a display name that is not someone else&apos;s.</li>
          <li>Keep your password to yourself. You are responsible for activity under your account.</li>
          <li>One account per person. Do not create accounts to evade a suspension or a rate limit.</li>
          <li>The editor may suspend or close an account that breaks these terms.</li>
          <li>You can delete your account at any time from account settings.</li>
        </ul>
      </Section>

      <Section title="4. Comments and reports">
        <p>
          You keep ownership of what you write. By posting, you grant us a non-exclusive, worldwide, royalty-free
          licence to store, display, reproduce and moderate that comment for as long as it is on the service. The
          licence ends when the comment is deleted, apart from copies in backups and audit records.
        </p>
        <p>Do not post:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Spam, coaching advertisements, affiliate links or repeated promotions.</li>
          <li>Harassment, threats, casteist, communal or sexual abuse, or someone&apos;s private information.</li>
          <li>Impersonation of a person, commission or newsroom.</li>
          <li>Content that is illegal, defamatory, or that you do not have the right to publish.</li>
          <li>Deliberate misinformation presented as fact.</li>
        </ul>
        <p>
          Comments are public and are shown with your display name. They expire with the story when it leaves the
          24-hour wire. Anyone can report a comment; reports are reviewed by the editor.
        </p>
      </Section>

      <Section title="5. Moderation">
        <p>
          The editor may hide, restore or delete a comment, close a report, or suspend an account. Moderation
          decisions are recorded in an internal audit log with the reason. We are not obliged to monitor every
          comment, and hiding one is not a finding that it was unlawful.
        </p>
        <p>
          If you believe a decision was wrong, reply to the editor with the comment and the reason. Do not create
          another account to repost it.
        </p>
      </Section>

      <Section title="6. Votes">
        <p>
          One vote per person per story. Votes are counted as a number; there is no public list of who voted and
          no leaderboard. Automated or coordinated vote manipulation, including scripting the API, is prohibited
          and may be reversed.
        </p>
      </Section>

      <Section title="7. Ownership">
        <p>
          Headlines, excerpts and images belong to their publishers and are shown for identification and
          commentary, with a link to the original. Nothing here transfers their rights to us or to you.
        </p>
        <p>
          The ranking, syllabus taxonomy, interface and editorial material are ours. The source code is released
          under the repository&apos;s MIT licence. Do not copy the site wholesale or present it as your own.
        </p>
      </Section>

      <Section title="8. Acceptable use">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Do not scrape at a rate that degrades the site, or bypass rate limits.</li>
          <li>Do not probe, scan or test security without written permission; report issues privately instead.</li>
          <li>Do not upload malware, attempt to access another reader&apos;s account, or interfere with the service.</li>
          <li>Do not use the site to break the law or to infringe someone else&apos;s rights.</li>
        </ul>
      </Section>

      <Section title="9. Third-party links">
        <p>
          Every story links to an external publisher. We do not control those sites and are not responsible for
          their content, paywalls, tracking or privacy practices. Read them on their terms.
        </p>
      </Section>

      <Section title="10. Availability and accuracy">
        <p>
          The service is provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any
          kind, including accuracy, completeness, fitness for a particular purpose or uninterrupted availability.
          Headlines are aggregated automatically and can be wrong, stale or taken out of context. Always verify
          exam notifications, dates and official documents at the source.
        </p>
      </Section>

      <Section title="11. Limitation of liability">
        <p>
          To the maximum extent permitted by law, we are not liable for indirect, incidental, special or
          consequential loss, or for loss of data, marks, opportunity or reputation, arising from use of the site
          or reliance on anything published on it. The service is free; where liability cannot be excluded, our
          total liability is limited to INR 1,000.
        </p>
        <p>Nothing here limits liability that cannot be limited under applicable law.</p>
      </Section>

      <Section title="12. Privacy">
        <p>
          What is collected and how long it is kept is set out in{" "}
          <Link href="/privacy" className="underline decoration-primary/40 underline-offset-2 hover:text-primary">
            the privacy policy
          </Link>
          , which forms part of these terms.
        </p>
      </Section>

      <Section title="13. Changes and governing law">
        <p>
          We may update these terms; the date at the top changes and a note appears on the wire when the change
          is material. These terms are governed by the laws of India, and disputes are subject to the jurisdiction
          of Indian courts.
        </p>
      </Section>

      <Section title="14. Contact">
        <p>
          Questions, reports and legal notices:{" "}
          <a
            href={`mailto:${SITE.editor.email}`}
            className="font-medium text-foreground underline decoration-primary/40 underline-offset-2 hover:text-primary"
          >
            {SITE.editor.email}
          </a>
          . For how the wire is built, see{" "}
          <Link href="/about" className="underline decoration-primary/40 underline-offset-2 hover:text-primary">
            the method
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}
