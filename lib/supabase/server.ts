import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function supabaseAuthConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("your-project")) return null;
  return { url, key };
}

export function authConfigured(): boolean {
  return supabaseAuthConfig() !== null;
}

/**
 * Cookie-bound Supabase client for server components, server actions and
 * route handlers. Session refreshes are written back to the cookie jar by
 * @supabase/ssr; in a Server Component the jar is read-only, so writes are
 * ignored there and handled by `proxy.ts` instead.
 */
export async function createSupabaseServer() {
  const config = supabaseAuthConfig();
  if (!config) throw new Error("Supabase auth is not configured");

  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            jar.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. proxy.ts refreshes instead.
        }
      },
    },
  });
}
