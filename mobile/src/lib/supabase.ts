import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase is used for one thing in the app: an optional account that makes
 * progress, saves and study circles survive a reinstall and a second device.
 * The wire itself stays anonymous.
 *
 * The anon key is public by design; row-level security is on with no policies,
 * so the app can only reach `/api/mobile/*`, never the tables.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseConfigured = Boolean(url && key);

export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          // The app has no browser URL to parse a magic link from.
          detectSessionInUrl: false,
        },
      })
    : null;

if (supabase) {
  // Refresh the token only while the app is in the foreground. A timer running
  // in the background is wasted work and can fire against a dead network.
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
