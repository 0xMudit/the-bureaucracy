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
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ApiError } from "@/api/client";
import { AuthProvider } from "@/lib/auth";
import { hydrateDesk, useDesk } from "@/lib/desk";
import { installNotificationHandler } from "@/lib/notifications";
import { hydrateProgress, noteVisit } from "@/lib/progress";
import { hydrateRevision } from "@/lib/revision";
import { hydrateSaved } from "@/lib/saved";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";

// Hold the splash until the serif is on screen: a flash of system sans on the
// masthead is the one thing that would make the app feel unlike the paper.
void SplashScreen.preventAutoHideAsync().catch(() => {});

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 30 * 60_000,
        // Native apps do not have a window to refocus; pull-to-refresh is the
        // explicit gesture instead of a surprise refetch.
        refetchOnWindowFocus: false,
        retry: (attempt, error) => error instanceof ApiError && error.retryable && attempt < 2,
      },
    },
  });
}

function RootNavigator() {
  const { colors, scheme } = useTheme();
  const { desk } = useDesk();
  const segments = useSegments();
  const router = useRouter();

  // The desk gate runs once per cold start. It is a redirect rather than a
  // conditional tree so deep links survive onboarding and land where they were
  // headed afterwards.
  useEffect(() => {
    if (desk.onboarded) return;
    if (segments[0] === "onboarding") return;
    router.replace("/onboarding");
  }, [desk.onboarded, segments, router]);

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
        <Stack.Screen name="account" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="circles" />
      </Stack>
    </>
  );
}

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
      await Promise.all([hydrateProgress(), hydrateSaved(), hydrateRevision(), hydrateDesk()]);
      noteVisit();
      installNotificationHandler();
      setStorageReady(true);
    })();
  }, []);

  const ready = fontsReady && storageReady;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
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
  );
}
