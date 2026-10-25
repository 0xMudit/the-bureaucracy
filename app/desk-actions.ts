"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DESK_COOKIE, DESK_COOKIE_MAX_AGE, DESK_SKIP_COOKIE, encodeDesk, normalizeDesk } from "@/lib/desk";
import type { Desk } from "@/lib/types";

/** Persists the reader's desk. No account, no server profile, no PII. */
export async function saveDeskAction(input: Desk): Promise<{ ok: boolean; desk: Desk }> {
  const desk = normalizeDesk(input);
  const jar = await cookies();
  jar.set(DESK_COOKIE, encodeDesk(desk), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DESK_COOKIE_MAX_AGE,
  });
  revalidatePath("/");
  return { ok: true, desk };
}

export async function clearDeskAction(): Promise<{ ok: boolean }> {
  const jar = await cookies();
  jar.delete(DESK_COOKIE);
  revalidatePath("/");
  return { ok: true };
}

/** "Not now" is remembered for a month so the question never nags. */
export async function skipDeskAction(): Promise<{ ok: boolean }> {
  const jar = await cookies();
  jar.set(DESK_SKIP_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/");
  return { ok: true };
}
