import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./supabase";

/**
 * Supabase emails come back to the app as a URL, and the shape of that URL
 * depends on how the link was requested:
 *
 *   bureaucracy://reset-password#access_token=…&refresh_token=…   (implicit)
 *   bureaucracy://reset-password?code=…                           (PKCE)
 *   bureaucracy://auth/confirm?token_hash=…&type=signup           (branded template)
 *
 * All three end in the same place: a session on this device. Parsing lives
 * here so the reset and confirmation screens cannot drift apart.
 */

export type LinkFailure = "expired" | "invalid" | "missing" | "unconfigured" | "failed";

export type LinkResult =
  | { ok: true; email: string | null }
  | { ok: false; reason: LinkFailure };

const OTP_TYPES = new Set<string>([
  "signup",
  "recovery",
  "email_change",
  "invite",
  "magiclink",
  "email",
]);

/** Read both the query string and the fragment — Supabase puts tokens in the fragment. */
export function linkParams(url: string): Map<string, string> {
  const params = new Map<string, string>();
  const hashAt = url.indexOf("#");
  const queryAt = url.indexOf("?");
  const chunks: string[] = [];

  if (queryAt >= 0) chunks.push(url.slice(queryAt + 1, hashAt > queryAt ? hashAt : undefined));
  if (hashAt >= 0) chunks.push(url.slice(hashAt + 1));

  for (const chunk of chunks) {
    for (const pair of chunk.split("&")) {
      if (!pair) continue;
      const eq = pair.indexOf("=");
      const key = eq >= 0 ? pair.slice(0, eq) : pair;
      const value = eq >= 0 ? pair.slice(eq + 1) : "";
      try {
        params.set(decodeURIComponent(key), decodeURIComponent(value));
      } catch {
        params.set(key, value);
      }
    }
  }

  return params;
}

function reasonOf(failure: unknown): LinkFailure {
  const text = failure instanceof Error ? failure.message.toLowerCase() : "";
  if (text.includes("expired")) return "expired";
  if (text.includes("verifier") || text.includes("invalid")) return "invalid";
  return "failed";
}

/**
 * Turn an incoming auth link into a signed-in session on this device.
 * Returns a reason instead of throwing so each screen can word the failure for
 * its own context.
 */
export async function adoptLinkSession(url: string): Promise<LinkResult> {
  if (!supabaseConfigured || !supabase) return { ok: false, reason: "unconfigured" };

  const params = linkParams(url);

  // Supabase reports dead links with an error pair instead of a token.
  const linkError = params.get("error_code") ?? params.get("error");
  if (linkError) {
    return { ok: false, reason: linkError === "otp_expired" ? "expired" : "invalid" };
  }

  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const type = (params.get("type") ?? "").toLowerCase();

  if (!code && !tokenHash && !(accessToken && refreshToken)) {
    return { ok: false, reason: "missing" };
  }

  try {
    if (tokenHash) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: (OTP_TYPES.has(type) ? type : "email") as EmailOtpType,
      });
      if (error) throw error;
    } else if (code) {
      // Works only if this device holds the PKCE verifier — which it does when
      // the reset was requested from this app.
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken as string,
        refresh_token: refreshToken as string,
      });
      if (error) throw error;
    }

    const { data } = await supabase.auth.getUser();
    return { ok: true, email: data.user?.email ?? null };
  } catch (failure) {
    return { ok: false, reason: reasonOf(failure) };
  }
}
