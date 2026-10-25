import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth";
import { authConfigured, createSupabaseServer } from "@/lib/supabase/server";

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

/**
 * Target of the verification button in the confirmation email.
 *
 * Two shapes are accepted:
 *  - `token_hash` + `type` from the branded template in supabase/templates;
 *  - `code` from Supabase's default PKCE email, which is what a free-tier
 *    project without custom SMTP sends.
 *
 * Both are exchanged for a session on the server, never in the browser.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const rawType = params.get("type");
  const type = rawType && OTP_TYPES.has(rawType as EmailOtpType) ? (rawType as EmailOtpType) : null;
  const fallback = safeNext(params.get("next"), "/account");

  const failure = (reason: "missing" | "unconfigured" | "expired" | "invalid" | "wrong_browser") => {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/check-email";
    url.search = `?error=${reason}`;
    return NextResponse.redirect(url);
  };

  const succeed = (metadata: unknown) => {
    const explicitNext = params.get("next");
    const isRecovery = type === "recovery" || explicitNext === "/auth/reset-password";
    const isEmailChange = type === "email_change";
    const metadataNext =
      metadata && typeof metadata === "object"
        ? (metadata as Record<string, unknown>).signup_next
        : null;

    const destination = safeNext(
      isRecovery
        ? (explicitNext ?? "/auth/reset-password")
        : isEmailChange
          ? (explicitNext ?? "/account?email=1")
          : typeof metadataNext === "string"
            ? metadataNext
            : explicitNext,
      fallback,
    );

    const target = new URL(destination, request.url);
    const url = request.nextUrl.clone();
    if (type === "signup") {
      // A fresh account gets the one-time profile setup before it lands on the
      // page it originally asked for.
      url.pathname = "/welcome";
      url.search = `?next=${encodeURIComponent(`${target.pathname}${target.search}`)}`;
      return NextResponse.redirect(url);
    }
    url.pathname = target.pathname;
    url.search = target.search;
    if (!isRecovery && !isEmailChange && target.pathname === "/account" && !url.searchParams.has("verified")) {
      url.searchParams.set("verified", "1");
    }
    return NextResponse.redirect(url);
  };

  // Supabase appends these when a link has already been used or has expired.
  const linkError = params.get("error_code") ?? params.get("error");
  if (linkError) return failure(linkError === "otp_expired" ? "expired" : "invalid");

  if (!authConfigured()) return failure("unconfigured");

  try {
    const supabase = await createSupabaseServer();

    // Default Supabase email (PKCE): /auth/confirm?code=…
    const code = params.get("code");
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const text = error.message.toLowerCase();
        if (text.includes("code verifier") || text.includes("verifier")) return failure("wrong_browser");
        return failure(error.code === "otp_expired" ? "expired" : "invalid");
      }
      return succeed(data.user?.user_metadata);
    }

    // Branded template: /auth/confirm?token_hash=…&type=signup
    if (!tokenHash || !type) return failure("missing");

    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return failure(error.code === "otp_expired" ? "expired" : "invalid");

    return succeed(data.user?.user_metadata);
  } catch {
    return failure("invalid");
  }
}
