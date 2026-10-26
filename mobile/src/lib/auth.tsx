import type { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { deleteAccount as deleteAccountRequest, setAuthToken } from "@/api/client";
import { refreshPushRegistration } from "./notifications";
import { resetSyncCursor, startAutoSync, syncAccount } from "./sync";
import { supabase, supabaseConfigured } from "./supabase";

/**
 * Accounts are optional. A reader can use the wire, finish briefs and keep a
 * streak without ever signing in; signing in adds a durable copy and a second
 * device.
 *
 * `storageReady` is a hard gate. Device state is hydrated asynchronously at
 * startup, and syncing before that finishes would merge the server's progress
 * with an empty local snapshot and then overwrite the device.
 */

interface AuthValue {
  configured: boolean;
  ready: boolean;
  session: Session | null;
  user: User | null;
  email: string | null;
  displayName: string | null;
  syncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    name?: string,
  ) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  /** Send a single-use recovery link that reopens this app on /reset-password. */
  requestPasswordReset: (email: string) => Promise<void>;
  /** Verify the current password, then replace it and sign other devices out. */
  changePassword: (current: string, next: string) => Promise<void>;
  /** Permanently remove the account and its server copy. */
  deleteAccount: (password: string, confirm: string) => Promise<void>;
  syncNow: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function nameOf(user: User | null): string | null {
  if (!user) return null;
  const metadata = user.user_metadata as { name?: unknown; full_name?: unknown } | undefined;
  const name =
    typeof metadata?.name === "string"
      ? metadata.name
      : typeof metadata?.full_name === "string"
        ? metadata.full_name
        : null;
  if (name?.trim()) return name.trim();
  return user.email ? user.email.split("@")[0] : null;
}

export function AuthProvider({
  children,
  storageReady = true,
}: {
  children: React.ReactNode;
  storageReady?: boolean;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabaseConfigured);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);

  const runSync = useCallback(async () => {
    if (!storageReady || running.current) return;
    running.current = true;
    setSyncing(true);
    try {
      await syncAccount();
      setLastSyncedAt(new Date().toISOString());
      setError(null);
    } catch {
      setError("Could not reach the account service. Your device copy is safe.");
    } finally {
      running.current = false;
      setSyncing(false);
    }
  }, [storageReady]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setAuthToken(data.session?.access_token ?? null);
      setSession(data.session);
      setReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setAuthToken(next?.access_token ?? null);
      setSession(next);
      setReady(true);
      if (!next) resetSyncCursor();
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // One full sync after startup (and after every sign-in), then debounced
  // pushes for each change while signed in.
  const signedIn = Boolean(session);
  useEffect(() => {
    if (!signedIn || !storageReady) return;
    void runSync();
    void refreshPushRegistration();
  }, [signedIn, storageReady, runSync]);

  useEffect(() => {
    if (!signedIn || !storageReady) return;
    return startAutoSync();
  }, [signedIn, storageReady]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      setError("Accounts are not configured in this build.");
      return;
    }
    setError(null);
    const { error: failure } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (failure) {
      setError(failure.message);
      throw new Error(failure.message);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    if (!supabase) {
      setError("Accounts are not configured in this build.");
      return { needsConfirmation: false };
    }
    setError(null);
    const { data, error: failure } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Bring the confirmation back into the app when the project allows the
        // scheme; otherwise Supabase falls back to the site URL and the web
        // confirmation still works.
        emailRedirectTo: Linking.createURL("/auth/confirm"),
        ...(name?.trim() ? { data: { name: name.trim() } } : {}),
      },
    });
    if (failure) {
      setError(failure.message);
      throw new Error(failure.message);
    }
    return { needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthToken(null);
    resetSyncCursor();
    setLastSyncedAt(null);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!supabase) {
      throw new Error("Accounts are not configured in this build.");
    }
    // The recovery link has to come back into the app. A reset started on the
    // phone has no PKCE verifier in a browser's cookie jar, so the web recovery
    // page could not exchange it.
    const redirectTo = Linking.createURL("/reset-password");
    const { error: failure } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo },
    );

    // Never turn this into an account-existence oracle: only rate limiting is
    // worth reporting, and even that is about the sender, not the address.
    const text = failure?.message.toLowerCase() ?? "";
    if (text.includes("rate limit") || text.includes("security purposes")) {
      throw new Error("Too many reset emails. Wait a few minutes and try again.");
    }
    if (failure && !text.includes("user")) {
      throw new Error("Could not reach the mail service. Try again.");
    }
  }, []);

  const changePassword = useCallback(
    async (current: string, next: string) => {
      if (!supabase) {
        throw new Error("Accounts are not configured in this build.");
      }
      const email = session?.user.email;
      if (!email) throw new Error("Sign in again to change your password.");

      // Prove the reader knows the current password before replacing it.
      const reauth = await supabase.auth.signInWithPassword({ email, password: current });
      if (reauth.error) throw new Error("The current password is not correct.");

      const { error: failure } = await supabase.auth.updateUser({ password: next });
      if (failure) {
        const text = failure.message.toLowerCase();
        if (text.includes("same password")) {
          throw new Error("Choose a password different from the current one.");
        }
        if (text.includes("least") || text.includes("weak")) {
          throw new Error("Use at least 8 characters for the new password.");
        }
        throw new Error("The password could not be changed. Try again.");
      }

      // A password change should end sessions on other devices.
      await supabase.auth.signOut({ scope: "others" }).catch(() => undefined);
    },
    [session],
  );

  const deleteAccount = useCallback(async (password: string, confirm: string) => {
    await deleteAccountRequest({ password, confirm });
    if (supabase) await supabase.auth.signOut().catch(() => undefined);
    setAuthToken(null);
    resetSyncCursor();
    setLastSyncedAt(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      configured: supabaseConfigured,
      ready,
      session,
      user: session?.user ?? null,
      email: session?.user?.email ?? null,
      displayName: nameOf(session?.user ?? null),
      syncing,
      lastSyncedAt,
      error,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      changePassword,
      deleteAccount,
      syncNow: runSync,
      clearError: () => setError(null),
    }),
    [
      ready,
      session,
      syncing,
      lastSyncedAt,
      error,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      changePassword,
      deleteAccount,
      runSync,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
