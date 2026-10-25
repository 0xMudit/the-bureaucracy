import { NextResponse, type NextRequest } from "next/server";
import { authConfigured, createSupabaseServer } from "@/lib/supabase/server";

type Failure = "missing" | "unconfigured" | "expired" | "invalid" | "wrong_browser";

/**
 * Landing point for Supabase's password-recovery email.
 *
 * Supabase appends a PKCE `code` to the configured redirect. A dedicated route
 * means we never have to guess how that query is appended to a URL that
 * already carries `?type=recovery&next=…`.
 *
 * A branded template that uses `token_hash` instead is forwarded to
 * `/auth/confirm`, which already knows how to exchange it.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const failure = (reason: Failure) => {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/forgot-password";
    url.search = `?error=${reason}`;
    return NextResponse.redirect(url);
  };

  // Supabase appends these when a link has already been used or has expired.
  const linkError = params.get("error_code") ?? params.get("error");
  if (linkError) return failure(linkError === "otp_expired" ? "expired" : "invalid");

  const tokenHash = params.get("token_hash");
  if (tokenHash) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/confirm";
    url.searchParams.set("type", "recovery");
    url.searchParams.set("next", "/auth/reset-password");
    return NextResponse.redirect(url);
  }

  const code = params.get("code");
  if (!code) return failure("missing");
  if (!authConfigured()) return failure("unconfigured");

  try {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const text = error.message.toLowerCase();
      if (text.includes("code verifier") || text.includes("verifier")) return failure("wrong_browser");
      return failure(error.code === "otp_expired" ? "expired" : "invalid");
    }
  } catch {
    return failure("invalid");
  }

  const url = request.nextUrl.clone();
  url.pathname = "/auth/reset-password";
  url.search = "";
  return NextResponse.redirect(url);
}
