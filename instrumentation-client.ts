import * as Sentry from "@sentry/nextjs";

/**
 * Browser error reporting, opt-in through NEXT_PUBLIC_SENTRY_DSN. No session
 * replay, no performance sampling, no PII, and no default integrations that
 * would attach request bodies or cookies.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: { allow: ["user-agent", "accept", "accept-language", "content-type"] },
        response: false,
      },
      httpBodies: [],
      stackFrameVariables: false,
    },
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.cookie;
          delete event.request.headers.authorization;
        }
      }
      return event;
    },
  });
}

/** Records client-side navigations as breadcrumbs when Sentry is enabled. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
