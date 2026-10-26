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
      position="top-left"
      // Sit below the sticky masthead (0.5px rule + brand row + nav row) so a
      // toast never covers the logo, search or account controls.
      offset={{ top: 104, left: 16 }}
      mobileOffset={{ top: 88, left: 12 }}
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
}
