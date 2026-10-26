import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getDeviceId } from "./device";
import { getDesk } from "./desk";
import { readJson, removeKey, writeJson } from "./storage";
import { registerPush, unregisterPush } from "@/api/client";

/**
 * Push is opt-in and late: the app asks only after the third completed brief,
 * never at launch. The token is tied to the device first and to the account
 * later, so a reader who declines sign-in still gets their daily nudge.
 *
 * `getExpoPushTokenAsync` needs an EAS project id. Expo Go has none, and a
 * local prebuild without `extra.eas.projectId` has none either, so this module
 * reports itself unavailable rather than throwing at the reader.
 */

const projectId =
  Constants.expoConfig?.extra?.eas?.projectId ??
  (Constants.easConfig as { projectId?: string } | null)?.projectId ??
  null;

const TOKEN_KEY = "tb.push.token.v1";

export const pushConfigured = Boolean(projectId && Device.isDevice);

export interface PushRegistration {
  granted: boolean;
  token: string | null;
  /** Human-readable reason, suitable for a settings row. */
  note: string;
}

let lastToken: string | null = null;

export function getLastPushToken(): string | null {
  return lastToken;
}

export async function permissionGranted(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const settings = await Notifications.getPermissionsAsync();
  return settings.status === Notifications.PermissionStatus.GRANTED;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("brief", {
    name: "The daily brief",
    description: "One nudge when the five stories are ready.",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180],
    lightColor: "#FF3B30",
  });
}

/**
 * Ask for permission, obtain the Expo token and hand it to the backend.
 * Call this only in response to a deliberate tap.
 */
export async function enablePush(): Promise<PushRegistration> {
  if (!Device.isDevice) {
    return { granted: false, token: null, note: "Push needs a physical device." };
  }
  if (!projectId) {
    return {
      granted: false,
      token: null,
      note: "Push is unavailable in this build. Install the App Store or Play Store build.",
    };
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== Notifications.PermissionStatus.GRANTED) {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }

  if (status !== Notifications.PermissionStatus.GRANTED) {
    return {
      granted: false,
      token: null,
      note: "Notifications are blocked in system settings.",
    };
  }

  await ensureAndroidChannel();

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    lastToken = token;
    writeJson(TOKEN_KEY, token);
    const deviceId = await getDeviceId().catch(() => null);
    await registerPush({
      token,
      platform: Platform.OS,
      deviceId,
      desk: getDesk(),
    });
    return { granted: true, token, note: "On. You will get one nudge a day." };
  } catch {
    return {
      granted: false,
      token: null,
      note: "Could not reach the notification service. Try again in a moment.",
    };
  }
}

/**
 * Re-register an existing device token after sign-in, so the nudge is attached
 * to the account as well as the device. A no-op if push was never enabled.
 */
export async function refreshPushRegistration(): Promise<void> {
  const token = lastToken ?? (await readJson<string | null>(TOKEN_KEY, null));
  if (!token) return;
  const deviceId = await getDeviceId().catch(() => null);
  try {
    await registerPush({ token, platform: Platform.OS, deviceId, desk: getDesk() });
    lastToken = token;
  } catch {
    // Offline: the token row already exists from the first registration.
  }
}

/** Turn push off for this device. Never throws. */
export async function disablePush(): Promise<void> {
  const token = lastToken ?? (await readJson<string | null>(TOKEN_KEY, null));
  lastToken = null;
  await removeKey(TOKEN_KEY);
  if (!token) return;
  try {
    const deviceId = await getDeviceId().catch(() => null);
    await unregisterPush(token, deviceId);
  } catch {
    // The server will disable the token when Expo reports it as unregistered.
  }
}

/**
 * Android 13+ (API 33) introduced the POST_NOTIFICATIONS runtime permission.
 * We request it once at startup — after hydration — so the reader isn't hit
 * with a system dialog before they've even seen the wire.
 *
 * Returns true if permission was already granted or just granted.
 * On iOS or older Android, this is a no-op that returns true.
 */
export async function requestAndroidNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  // expo-notifications wraps the Android 13+ permission automatically when
  // requestPermissionsAsync is called. On older API levels it resolves GRANTED
  // without showing a dialog.
  const { status } = await Notifications.requestPermissionsAsync({
    android: {},
  });
  return status === Notifications.PermissionStatus.GRANTED;
}

/** Set the foreground presentation once, when the app module loads. */
export function installNotificationHandler(): void {
  if (Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}
