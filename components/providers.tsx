"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AutoRefresh } from "@/components/auto-refresh";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {children}
      <Toaster />
      <AutoRefresh />
      <KeyboardShortcuts />
    </NextThemesProvider>
  );
}
