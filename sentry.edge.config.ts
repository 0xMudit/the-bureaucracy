import * as Sentry from "@sentry/nextjs";

/** Edge routes (proxy and the few edge handlers) share the server policy. */
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: 0,
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
