// Import each weight from its own entry point. Importing from the package root
// pulls every weight (7 MB of Inter alone) into the bundle.
import { IBMPlexMono_400Regular } from "@expo-google-fonts/ibm-plex-mono/400Regular";
import { IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono/500Medium";
import { InstrumentSerif_400Regular } from "@expo-google-fonts/instrument-serif/400Regular";
import { InstrumentSerif_400Regular_Italic } from "@expo-google-fonts/instrument-serif/400Regular_Italic";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { Component, useEffect, useState } from "react";
import {
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import {
  Pressable,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ApiError } from "@/api/client";
import { AuthProvider } from "@/lib/auth";
import { hydrateDesk, useDesk } from "@/lib/desk";
import { installNotificationHandler, requestAndroidNotificationPermission } from "@/lib/notifications";
import { hydrateProgress, noteVisit } from "@/lib/progress";
import { hydrateRevision } from "@/lib/revision";
import { hydrateSaved } from "@/lib/saved";
import { hydrateTheme, ThemeProvider, useTheme } from "@/theme/ThemeProvider";

// Hold the splash until fonts are on screen — a flash of system-sans on the
// masthead is the one thing that would make the app feel unlike the paper.
void SplashScreen.preventAutoHideAsync().catch(() => {});

/* ─────────────────────────────────────────────────────────────────────────── *
 *  React Query
 * ─────────────────────────────────────────────────────────────────────────── */

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 30 * 60_000,
        // Native apps do not refetch on window focus — pull-to-refresh is the
        // explicit gesture the reader expects instead.
        refetchOnWindowFocus: false,
        retry: (attempt, error) => error instanceof ApiError && error.retryable && attempt < 2,
      },
    },
  });
}

/* ─────────────────────────────────────────────────────────────────────────── *
 *  Root Error Boundary
 *  Catches JS crashes anywhere in the tree and shows a recovery screen
 *  instead of a blank white crash. Uses a class component — hooks can't
 *  implement componentDidCatch.
 * ─────────────────────────────────────────────────────────────────────────── */

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class RootErrorBoundary extends Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred.";
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // In production, pipe to Sentry or your crash reporter here.
    console.error("[RootErrorBoundary]", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#1C1C1C",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
      >
        <Text
          style={{
            fontFamily: "IBMPlexMono_400Regular",
            fontSize: 9,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#F87171",
            marginBottom: 16,
          }}
        >
          Something went wrong
        </Text>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "600",
            color: "#FAFAFA",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          The app ran into a problem.
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: "#A3A3A3",
            textAlign: "center",
            lineHeight: 20,
            marginBottom: 32,
            fontFamily: "Inter_400Regular",
          }}
        >
          {this.state.message || "Please restart the app. Your reading progress is safe."}
        </Text>
        <Pressable
          onPress={this.handleRetry}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#333" : "#292929",
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: "#3D3D3D",
            borderRadius: 8,
            paddingHorizontal: 24,
            paddingVertical: 12,
          })}
        >
          <Text
            style={{
              fontFamily: "IBMPlexMono_400Regular",
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: "#FAFAFA",
            }}
          >
            Try again
          </Text>
        </Pressable>
      </View>
    );
  }
}

/* ─────────────────────────────────────────────────────────────────────────── *
 *  Navigator — onboarding gate + deep links
 * ─────────────────────────────────────────────────────────────────────────── */

function RootNavigator() {
  const { colors, scheme } = useTheme();
  const { desk } = useDesk();
  const segments = useSegments();
  const router = useRouter();

  // Onboarding gate: runs once per cold start. It is a redirect rather than a
  // conditional tree so deep links survive onboarding and land where intended.
  useEffect(() => {
    if (desk.onboarded) return;
    if (segments[0] === "onboarding") return;
    // A recovery or confirmation link must survive the gate: the reader may be
    // finishing either on a phone that has never completed onboarding.
    if (segments[0] === "reset-password" || segments[0] === "auth") return;
    router.replace("/onboarding");
  }, [desk.onboarded, segments, router]);

  // Deep-link handler for story URLs that arrive while the app is foregrounded.
  // expo-router handles cold-start deep links automatically; this covers the
  // case where the app is already open and a notification or share-sheet link
  // opens a story.
  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      // bureaucracy://item/SOME_ID  or  https://the-bureaucracy.vercel.app/item/SOME_ID
      const parsed = Linking.parse(url);
      const pathParts = (parsed.path ?? "").replace(/^\//, "").split("/");
      if (pathParts[0] === "item" && pathParts[1]) {
        router.push({ pathname: "/item/[id]", params: { id: pathParts[1] } });
      }
    });
    return () => subscription.remove();
  }, [router]);

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} animated />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="item/[id]" />
        <Stack.Screen name="search" options={{ presentation: "modal", animation: "fade" }} />
        <Stack.Screen
          name="onboarding"
          options={{ animation: "fade", gestureEnabled: false }}
        />
        <Stack.Screen
          name="account"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen name="circles" />
        <Stack.Screen
          name="reset-password"
          options={{ gestureEnabled: false, animation: "fade" }}
        />
        <Stack.Screen name="auth/confirm" options={{ gestureEnabled: false, animation: "fade" }} />
      </Stack>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── *
 *  Root Layout
 * ─────────────────────────────────────────────────────────────────────────── */

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });
  const [queryClient] = useState(createQueryClient);
  const [storageReady, setStorageReady] = useState(false);

  const fontsReady = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    // Every device store hydrates in parallel, then one visit is recorded. The
    // tree does not mount until this finishes: rendering a zero streak and then
    // replacing it with the real one looks like a bug, and signing in before
    // hydration would overwrite the device with an empty remote state.
    void (async () => {
      await Promise.all([
        hydrateProgress(),
        hydrateSaved(),
        hydrateRevision(),
        hydrateDesk(),
        hydrateTheme(),
      ]);
      noteVisit();
      installNotificationHandler();

      // Android 13+ (API 33+) requires an explicit runtime permission for
      // POST_NOTIFICATIONS. Request it here, after hydration, so it doesn't
      // fire before the user even sees the app.
      await requestAndroidNotificationPermission();

      setStorageReady(true);
    })();
  }, []);

  const ready = fontsReady && storageReady;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Keep the JS thread alive until fonts + storage are ready. The splash
  // screen is visible at this point, so the user sees nothing wrong.
  if (!ready) return null;

  return (
    <RootErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ThemeProvider>
                <RootNavigator />
              </ThemeProvider>
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </RootErrorBoundary>
  );
}
