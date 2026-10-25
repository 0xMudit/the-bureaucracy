"use client";

import { useMemo } from "react";
import NiceAvatar, { genConfig } from "react-nice-avatar";
import { avatarSeed, type AvatarConfig } from "@/lib/avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  id,
  config,
  size = 32,
  className,
  shape = "circle",
}: {
  name: string;
  id?: string | null;
  config?: AvatarConfig | null;
  size?: number;
  className?: string;
  shape?: "circle" | "rounded" | "square";
}) {
  const resolved = useMemo(() => {
    const hasConfig = config && Object.keys(config).length > 2;
    return genConfig(hasConfig ? config : avatarSeed(name, id));
  }, [config, id, name]);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 overflow-hidden border border-border/80 bg-muted ring-1 ring-background",
        shape === "circle" ? "rounded-full" : "rounded-sm",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <NiceAvatar
        {...resolved}
        shape={shape === "circle" ? "circle" : "square"}
        className="size-full"
        style={{ width: "100%", height: "100%" }}
      />
    </span>
  );
}
