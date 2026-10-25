import type { AvatarFullConfig } from "react-nice-avatar";

export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "api",
  "account",
  "auth",
  "following",
  "login",
  "logout",
  "moderator",
  "notifications",
  "saved",
  "settings",
  "signup",
  "submit",
  "support",
  "the-bureaucracy",
  "welcome",
]);

export function normalizeUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

export function cleanDisplayName(value: string): string {
  return value
    .replace(/[<>\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 48);
}

const AVATAR_KEYS = new Set([
  "sex",
  "faceColor",
  "earSize",
  "hairColor",
  "hairStyle",
  "hairColorRandom",
  "hatColor",
  "hatStyle",
  "eyeStyle",
  "glassesStyle",
  "noseStyle",
  "mouthStyle",
  "shirtStyle",
  "shirtColor",
  "bgColor",
  "isGradient",
  "eyeBrowStyle",
]);

/**
 * Keep only the avatar fields the renderer understands. A profile is a public
 * surface, so a hand-crafted form post must not be able to stuff arbitrary
 * jsonb into it.
 */
export function parseAvatarJson(value: FormDataEntryValue | null): AvatarFullConfig | null {
  if (typeof value !== "string" || !value.trim()) return null;
  if (value.length > 6000) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const clean: Record<string, string | boolean> = {};
    for (const [key, entry] of Object.entries(parsed)) {
      if (!AVATAR_KEYS.has(key)) continue;
      if (typeof entry === "boolean") clean[key] = entry;
      else if (typeof entry === "string" && entry.length <= 80) clean[key] = entry;
    }
    return Object.keys(clean).length >= 3 ? (clean as AvatarFullConfig) : null;
  } catch {
    return null;
  }
}
