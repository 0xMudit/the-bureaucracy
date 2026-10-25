"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

/**
 * Last-resort boundary: it replaces the root layout, so it must render its own
 * html/body and cannot rely on the app's stylesheet. Keep the inline styles
 * deliberately plain.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f8f5ef",
          color: "#16130f",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <main style={{ maxWidth: 460, padding: "48px 24px" }}>
          <p
            style={{
              margin: 0,
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#bd191d",
            }}
          >
            The wire is down
          </p>
          <h1 style={{ margin: "8px 0 0", fontSize: 34, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            Something in the press broke.
          </h1>
          <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: "#5c554c" }}>
            The page could not be rendered. Your reading list is stored on this device, so nothing is lost.
          </p>
          <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={reset}
              style={{
                height: 36,
                padding: "0 14px",
                border: "1px solid #16130f",
                background: "#16130f",
                color: "#f8f5ef",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 36,
                padding: "0 14px",
                border: "1px solid #d6cfc3",
                color: "#16130f",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Back to the wire
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
