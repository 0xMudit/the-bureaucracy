import * as Sentry from "@sentry/nextjs";

/**
 * Server error reporting is opt-in: with no DSN the SDK is never initialised
 * and the app logs to the platform as before.
 *
 * Performance tracing and replay stay off. This is a small news site; an error
 * report should tell us that a page threw, not build a behavioural profile of
 * the reader. `sendDefaultPii` is false and cookies/authorisation headers are
 * stripped before the event leaves the process.
 */
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: 0,
    // Sentry v11's data-collection switches: no user identity, no cookies, no
    // request bodies, no local variables. Only the error, the route and the
    // headers needed to reproduce it.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: { allow: ["user-agent", "accept", "accept-language", "content-type"] },
        response: false,
      },
      httpBodies: [],
      stackFrameVariables: false,
      databaseQueryData: false,
    },
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.cookie;
          delete event.request.headers.authorization;
          delete event.request.headers["x-device-id"];
        }
      }
      return event;
    },
  });
}
