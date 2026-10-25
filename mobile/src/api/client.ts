import { Platform } from "react-native";
import type {
  ApiFailure,
  BriefResponse,
  CircleResponse,
  CirclesResponse,
  FeedFilters,
  FeedResponse,
  ReaderStateResponse,
  ReaderProgressPayload,
  ReaderSave,
  StoryResponse,
  SubscribeResponse,
  TaxonomyResponse,
  VoteResponse,
} from "./types";

/**
 * The mobile client talks to the Next.js app, never to Postgres. The database
 * has row-level security on with no policies and only the service role can
 * read it, so these endpoints are the app's entire supply of data.
 */

const CONFIGURED = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

/**
 * `localhost` inside the Android emulator points at the emulator itself. The
 * host machine is 10.0.2.2. Rewriting here means `.env` stays the same across
 * iOS and Android.
 */
function resolveBaseUrl(raw: string): string {
  const base = raw.trim().replace(/\/+$/, "");
  if (Platform.OS === "android" && /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base)) {
    return base.replace(/\/\/(localhost|127\.0\.0\.1)/, "//10.0.2.2");
  }
  return base;
}

export const API_BASE_URL = resolveBaseUrl(CONFIGURED);

export class ApiError extends Error {
  status: number;
  retryAfter?: number;

  constructor(message: string, status: number, retryAfter?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryAfter = retryAfter;
  }

  /** 410 means the story aged out of the wire — a normal end, not a fault. */
  get expired(): boolean {
    return this.status === 410;
  }

  /** Worth retrying: network flake, timeout or a server-side problem. */
  get retryable(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

const DEFAULT_TIMEOUT_MS = 12_000;

/**
 * The access token is held in memory and attached to every request that might
 * need it. `AuthProvider` sets it on sign-in and clears it on sign-out; the
 * public endpoints simply ignore the header.
 */
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  deviceId?: string | null;
  timeoutMs?: number;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, deviceId, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        ...(body ? { "content-type": "application/json" } : {}),
        ...(deviceId ? { "x-device-id": deviceId } : {}),
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new ApiError("The server sent a response the app could not read.", response.status);
      }
    }

    if (!response.ok) {
      const failure = payload as ApiFailure | null;
      throw new ApiError(
        failure?.error ?? `Request failed (${response.status}).`,
        response.status,
        failure?.retryAfter,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("The wire took too long to answer. Check your connection.", 0);
    }
    throw new ApiError(
      `Could not reach The Bureaucracy at ${API_BASE_URL}.`,
      0,
    );
  } finally {
    clearTimeout(timer);
  }
}

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === "all") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export async function getFeed(
  filters: FeedFilters,
  deviceId?: string | null,
  limit = 40,
  desk?: string | null,
): Promise<FeedResponse> {
  return request<FeedResponse>(
    `/api/mobile/feed${queryString({
      sort: filters.sort,
      topic: filters.topic,
      optional: filters.optional,
      paper: filters.paper,
      q: filters.q.trim(),
      limit,
      desk: desk ?? undefined,
    })}`,
    { deviceId },
  );
}

export async function getBrief(desk?: string | null): Promise<BriefResponse> {
  return request<BriefResponse>(
    `/api/mobile/brief${queryString({ desk: desk ?? undefined })}`,
    { timeoutMs: 15_000 },
  );
}

/* ------------------------------ reader state ------------------------------ */

export async function getReaderState(): Promise<ReaderStateResponse> {
  return request<ReaderStateResponse>("/api/mobile/state");
}

export async function putReaderState(payload: {
  progress?: ReaderProgressPayload;
  saves?: ReaderSave[];
}): Promise<ReaderStateResponse> {
  return request<ReaderStateResponse>("/api/mobile/state", {
    method: "PUT",
    body: payload,
    timeoutMs: 20_000,
  });
}

/* ---------------------------------- push ---------------------------------- */

export async function registerPush(input: {
  token: string;
  platform: string;
  deviceId?: string | null;
  desk?: unknown;
}): Promise<{ ok: boolean; registered: boolean }> {
  return request("/api/mobile/push", {
    method: "POST",
    body: input,
    deviceId: input.deviceId ?? null,
  });
}

export async function unregisterPush(token: string, deviceId?: string | null): Promise<void> {
  await request("/api/mobile/push", { method: "DELETE", body: { token }, deviceId });
}

/* -------------------------------- circles --------------------------------- */

export async function getCircles(): Promise<CirclesResponse> {
  return request<CirclesResponse>("/api/mobile/circles", { timeoutMs: 15_000 });
}

export async function createCircle(name: string): Promise<CircleResponse> {
  return request<CircleResponse>("/api/mobile/circles", { method: "POST", body: { name } });
}

export async function joinCircle(code: string): Promise<CircleResponse> {
  return request<CircleResponse>("/api/mobile/circles/join", {
    method: "POST",
    body: { code },
  });
}

/* -------------------------------- subscribe ------------------------------- */

/**
 * The digest lives on the web origin, not under `/api/mobile`, because the
 * confirmation and unsubscribe links are browser pages.
 */
export async function subscribeDigest(email: string): Promise<SubscribeResponse> {
  return request<SubscribeResponse>("/api/subscribe", { method: "POST", body: { email } });
}

export async function getStory(id: string, deviceId?: string | null): Promise<StoryResponse> {
  return request<StoryResponse>(`/api/mobile/item/${encodeURIComponent(id)}`, { deviceId });
}

export async function getTaxonomy(): Promise<TaxonomyResponse> {
  return request<TaxonomyResponse>("/api/mobile/taxonomy", { timeoutMs: 15_000 });
}

export async function postVote(itemId: string, deviceId: string): Promise<VoteResponse> {
  return request<VoteResponse>("/api/mobile/vote", {
    method: "POST",
    body: { itemId },
    deviceId,
  });
}
