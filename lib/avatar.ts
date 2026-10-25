import type { AvatarFullConfig } from "react-nice-avatar";

export type AvatarConfig = AvatarFullConfig;

export const AVATAR_PRESETS = [
  "reader-press",
  "delhi-morning",
  "monsoon-desk",
  "mains-2027",
  "coffee-and-current-affairs",
  "night-shift",
] as const;

export function avatarSeed(name: string, id?: string | null): string {
  return `${name.trim().toLowerCase()}|${id ?? ""}` || "the-bureaucracy-reader";
}

/** Convert a jsonb column into a typed avatar config without trusting its shape. */
export function normalizeAvatarConfig(value: unknown): AvatarConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as AvatarConfig;
}
