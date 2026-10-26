import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Database, Key, Settings, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSessionUser, userCan } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings · The desk",
  robots: { index: false, follow: false },
};

function envStatus(key: string): "set" | "missing" {
  const val = process.env[key];
  return val && val.trim() && !val.includes("your-") ? "set" : "missing";
}

export default async function AdminSettingsPage() {
  const user = await getSessionUser();
  if (!user || !userCan(user, "admin.dashboard")) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="border border-border bg-card p-6">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Restricted</p>
          <h1 className="display mt-1 text-[2rem] leading-none">Not accessible.</h1>
          <Button asChild className="mt-5 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em]">
            <Link href="/admin">Back to the desk</Link>
          </Button>
        </div>
      </div>
    );
  }

  const dbOk = supabaseConfigured();

  const envGroups = [
    {
      label: "Supabase (required for accounts)",
      keys: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
    },
    {
      label: "Web push / VAPID (required for notifications)",
      keys: ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"],
    },
    {
      label: "LLM providers (one or more required for enrichment)",
      keys: ["GEMINI_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_AI_TOKEN"],
    },
    {
      label: "Sentry (optional error monitoring)",
      keys: ["NEXT_PUBLIC_SENTRY_DSN", "SENTRY_AUTH_TOKEN"],
    },
    {
      label: "Admin access",
      keys: ["ADMIN_EMAILS"],
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="border-b-2 border-foreground pb-4">
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
          <Settings className="size-3.5" /> Configuration
        </p>
        <h1 className="display mt-1 text-[2.2rem] leading-none tracking-[-0.02em] sm:text-[2.8rem]">
          Settings.
        </h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
          Environment variable health check. Values are never shown — only whether the key is set.
        </p>
      </div>

      {/* Database status */}
      <div className={`mt-6 flex items-center gap-3 border p-4 ${dbOk ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
        <Database className={`size-5 shrink-0 ${dbOk ? "text-success" : "text-destructive"}`} />
        <div>
          <p className={`font-medium ${dbOk ? "text-success" : "text-destructive"}`}>
            {dbOk ? "Supabase connected" : "Running in local-store mode"}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {dbOk
              ? "Accounts, reactions, comments and push subscriptions persist to Postgres."
              : "Votes and comments are stored in .data/store.json. Set Supabase env vars to enable production persistence."}
          </p>
        </div>
      </div>

      {/* Env var groups */}
      <div className="mt-6 space-y-5">
        {envGroups.map(({ label, keys }) => (
          <div key={label}>
            <h2 className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</h2>
            <div className="mt-2 divide-y divide-border overflow-hidden border border-border bg-card">
              {keys.map((key) => {
                const status = envStatus(key);
                return (
                  <div key={key} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <code className="font-mono text-[11px] text-foreground">{key}</code>
                    {status === "set" ? (
                      <Badge className="gap-1 font-mono text-[8px] uppercase tracking-[0.08em]">
                        <CheckCircle2 className="size-2.5" /> Set
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 border-muted-foreground/30 font-mono text-[8px] uppercase tracking-[0.08em] text-muted-foreground">
                        Missing
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Quick actions</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="h-8 rounded-sm font-mono text-[9px] uppercase tracking-[0.12em]">
            <Link href="/api/health">
              <Shield className="size-3.5" /> Health check
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 rounded-sm font-mono text-[9px] uppercase tracking-[0.12em]">
            <Link href="/api/ingest">
              <Zap className="size-3.5" /> Trigger ingest
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 rounded-sm font-mono text-[9px] uppercase tracking-[0.12em]">
            <Link href="/api/ai/process">
              <Key className="size-3.5" /> Run LLM enrichment
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 rounded-sm font-mono text-[9px] uppercase tracking-[0.12em]">
            <Link href="/api/push/vapid">
              <Key className="size-3.5" /> Check VAPID keys
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-8 border border-dashed border-border p-4">
        <h2 className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          How to grant admin access
        </h2>
        <div className="mt-2 space-y-2 text-[12.5px] leading-relaxed text-muted-foreground">
          <p>
            <strong className="font-medium text-foreground">Option 1 — env var (recommended):</strong> Add the
            email to <code className="rounded bg-muted px-1 text-[10px]">ADMIN_EMAILS</code> (comma-separated).
            This account will always be admin regardless of the database.
          </p>
          <p>
            <strong className="font-medium text-foreground">Option 2 — CLI script:</strong> Run{" "}
            <code className="rounded bg-muted px-1 text-[10px]">npm run auth:admins</code> after setting{" "}
            <code className="rounded bg-muted px-1 text-[10px]">ADMIN_EMAILS</code>.
          </p>
          <p>
            <strong className="font-medium text-foreground">Option 3 — in-app:</strong> Use the Accounts page
            to promote a user to the admin role. Requires an existing admin.
          </p>
        </div>
      </div>
    </div>
  );
}
