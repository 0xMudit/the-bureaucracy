import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * All device state goes through this module.
 *
 * The web stores progress synchronously in localStorage; AsyncStorage is async.
 * Each store below keeps an in-memory snapshot for synchronous reads (React
 * needs a value during render) and hydrates it once at startup. Writes update
 * memory first and persist in the background, so a failed write never blocks a
 * tap.
 */

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {
    // Progress, saves and preferences are conveniences; a failed write must not
    // take the screen down with it.
  });
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}
