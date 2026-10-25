import { Platform } from "react-native";
import type {
  ApiFailure,
  FeedFilters,
  FeedResponse,
  StoryResponse,
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

interface RequestOptions {
  method?: "GET" | "POST";
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
): Promise<FeedResponse> {
  return request<FeedResponse>(
    `/api/mobile/feed${queryString({
      sort: filters.sort,
      topic: filters.topic,
      optional: filters.optional,
      paper: filters.paper,
      q: filters.q.trim(),
      limit,
    })}`,
    { deviceId },
  );
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
