const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Compact relative time, matching the web's `timeAgo`. */
export function timeAgo(date: Date | string, now = Date.now()): string {
  const value = typeof date === "string" ? new Date(date) : date;
  const diff = now - value.getTime();
  if (diff < 0) return "just now";

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return seconds < 10 ? "just now" : `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return formatDate(value);
}

export function formatDate(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return `${pad(value.getDate())} ${MONTHS[value.getMonth()]} ${value.getFullYear()}`;
}

/** The dateline under the masthead: "Sun, 25 Oct". */
export function dateline(date = new Date()): string {
  return `${WEEKDAYS[date.getDay()]}, ${pad(date.getDate())} ${MONTHS[date.getMonth()]}`;
}

/** How long this story has left before the wire deletes it. */
export function timeLeft(expiresAt: string): string {
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) return "leaving now";
  const hours = Math.floor(remaining / 3_600_000);
  if (hours >= 1) return `${hours}h left`;
  const minutes = Math.max(1, Math.floor(remaining / 60_000));
  return `${minutes}m left`;
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}
