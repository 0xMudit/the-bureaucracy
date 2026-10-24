"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function toasterTheme(theme: string | undefined): ToasterProps["theme"] {
  return theme === "dark" ? "dark" : theme === "light" ? "light" : "system";
}

export function Toaster(props: ToasterProps) {
  const { theme } = useTheme();
  return (
    <Sonner
      theme={toasterTheme(theme)}
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
}
