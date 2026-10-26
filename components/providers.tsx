"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AutoRefresh } from "@/components/auto-refresh";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { CommandMenu } from "@/components/command-menu";
import { OpeningSequence } from "@/components/opening-sequence";
import { ThemeColorSync } from "@/components/theme-color-sync";
import { PwaRegister } from "@/components/pwa-register";
import { PermissionPrompt } from "@/components/permission-prompt";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      enableColorScheme
      storageKey="tb-theme"
      disableTransitionOnChange
    >
      <OpeningSequence />
      {children}
      <ThemeColorSync />
      <PwaRegister />
      <PermissionPrompt />
      <CommandMenu />
      <Toaster />
      <AutoRefresh />
      <KeyboardShortcuts />
    </NextThemesProvider>
  );
}
