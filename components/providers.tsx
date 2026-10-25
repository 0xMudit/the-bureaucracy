"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AutoRefresh } from "@/components/auto-refresh";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { CommandMenu } from "@/components/command-menu";
import { OpeningSequence } from "@/components/opening-sequence";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      enableColorScheme
      storageKey="tb-theme"
      disableTransitionOnChange
    >
      <OpeningSequence />
      {children}
      <CommandMenu />
      <Toaster />
      <AutoRefresh />
      <KeyboardShortcuts />
    </NextThemesProvider>
  );
}
