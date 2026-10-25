import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config";

/**
 * Installable from the home screen, which is the cheapest re-entry loop we
 * can offer without asking for an email address.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — ${SITE.tagline}`,
    short_name: SITE.shortName,
    description: SITE.description,
    start_url: "/#brief",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#171512",
    theme_color: "#171512",
    categories: ["news", "education"],
    icons: [
      {
        src: "/brand/logo.jpg",
        sizes: "any",
        type: "image/jpeg",
        purpose: "any",
      },
    ],
  };
}
