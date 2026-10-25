import * as SecureStore from "expo-secure-store";

/**
 * A stable, anonymous device identity. It is what the API records in `votes`
 * (namespaced server-side as `m_<id>`), mirroring the web's `tb_voter` cookie.
 * There is no account, so there is nothing personal here — just a vote tally.
 */

const STORAGE_KEY = "tb.device.id";
const VALID = /^[A-Za-z0-9_-]{8,64}$/;

let cached: string | null = null;

function createId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let random = "";
  for (let index = 0; index < 20; index += 1) {
    random += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `dev_${Date.now().toString(36)}${random}`;
}

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;

  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    if (stored && VALID.test(stored)) {
      cached = stored;
      return stored;
    }
  } catch {
    // SecureStore can be unavailable (web, or a locked keychain). A per-session
    // id still lets the reader vote; it just will not survive a restart.
  }

  const id = createId();
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, id);
  } catch {
    // Non-fatal: see above.
  }
  cached = id;
  return id;
}
