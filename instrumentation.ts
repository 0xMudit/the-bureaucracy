import * as Sentry from "@sentry/nextjs";

/**
 * Loads the runtime-specific Sentry config and reports server-side request
 * errors (Server Components, route handlers, server actions). Next calls this
 * once per runtime; the DSN check lives inside the config files.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
