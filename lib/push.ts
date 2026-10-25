import { serviceClient } from "./store";

/**
 * Expo push delivery. The daily job builds one message per desk, batches it,
 * and disables tokens Expo reports as unregistered so the table self-cleans.
 *
 * Without an Expo access token this still works for public projects; without
 * any tokens it is a no-op. That keeps the cron honest in preview and local.
 */

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default";
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

const ENDPOINT = "https://exp.host/--/api/v2/push/send";
const BATCH = 100;

export interface PushResult {
  sent: number;
  failed: number;
  disabled: number;
}

export async function sendExpoPush(messages: PushMessage[]): Promise<PushResult> {
  const result: PushResult = { sent: 0, failed: 0, disabled: 0 };
  if (!messages.length) return result;

  const headers: Record<string, string> = {
    accept: "application/json",
    "accept-encoding": "gzip, deflate",
    "content-type": "application/json",
  };
  const accessToken = process.env.EXPO_ACCESS_TOKEN;
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;

  const dead = new Set<string>();

  for (let index = 0; index < messages.length; index += BATCH) {
    const batch = messages.slice(index, index + BATCH);
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify(batch.map((message) => ({ ...message, sound: message.sound ?? "default" }))),
      });

      if (!response.ok) {
        result.failed += batch.length;
        continue;
      }

      const payload = (await response.json()) as { data?: ExpoTicket[] };
      const tickets = payload.data ?? [];
      tickets.forEach((ticket, ticketIndex) => {
        if (ticket.status === "ok") {
          result.sent += 1;
          return;
        }
        result.failed += 1;
        if (ticket.details?.error === "DeviceNotRegistered") {
          const token = batch[ticketIndex]?.to;
          if (token) dead.add(token);
        }
      });
    } catch {
      result.failed += batch.length;
    }
  }

  if (dead.size) {
    const db = serviceClient();
    if (db) {
      const { error } = await db.from("tb_push_tokens").update({ enabled: false }).in("token", [...dead]);
      if (!error) result.disabled = dead.size;
    }
  }

  return result;
}

export function isExpoPushToken(value: unknown): value is string {
  return typeof value === "string" && /^(Exponent|Expo)PushToken\[[A-Za-z0-9_-]{10,200}\]$/.test(value);
}
