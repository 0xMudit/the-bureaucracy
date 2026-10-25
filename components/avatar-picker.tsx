"use client";

import { useState } from "react";
import { Dices, Shuffle } from "lucide-react";
import NiceAvatar, { genConfig, type AvatarFullConfig } from "react-nice-avatar";
import { AVATAR_PRESETS, avatarSeed } from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HAIR = ["normal", "thick", "mohawk", "womanLong", "womanShort"] as const;
const EYES = ["circle", "oval", "smile"] as const;
const GLASSES = ["none", "round", "square"] as const;
const SHIRTS = ["hoody", "short", "polo"] as const;
const BACKGROUNDS = ["#dbeafe", "#fce7f3", "#dcfce7", "#fef3c7", "#ede9fe", "#e0f2fe", "#ffedd5", "#f3e8ff"];

function randomSeed(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random()}`;
}

export function AvatarPicker({
  initial,
  name,
  userId,
}: {
  initial?: AvatarFullConfig | null;
  name: string;
  userId?: string | null;
}) {
  const [config, setConfig] = useState<AvatarFullConfig>(() =>
    genConfig(initial && Object.keys(initial).length > 2 ? initial : avatarSeed(name, userId)),
  );

  const patch = (next: Partial<AvatarFullConfig>) => setConfig((current) => ({ ...current, ...next }));

  return (
    <div className="space-y-5">
      <input type="hidden" name="avatar" value={JSON.stringify(config)} />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative mx-auto flex size-36 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-card p-1 sm:mx-0">
          <NiceAvatar {...config} shape="circle" className="size-full rounded-full" />
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 border border-border bg-background px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
            Your byline
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Presets</p>
          <div className="mt-2 grid grid-cols-6 gap-1.5" role="group" aria-label="Avatar presets">
            {AVATAR_PRESETS.map((seed) => {
              const preset = genConfig(seed);
              return (
                <button
                  key={seed}
                  type="button"
                  onClick={() => setConfig(preset)}
                  className="rounded-full border border-border bg-muted p-0.5 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Use preset ${seed.replace(/-/g, " ")}`}
                >
                  <NiceAvatar {...preset} shape="circle" className="size-10 rounded-full" />
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setConfig(genConfig(randomSeed()))}
              className="h-8 rounded-sm font-mono text-[9px] uppercase tracking-[0.12em]"
            >
              <Dices className="size-3.5" /> Randomise
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setConfig(genConfig(avatarSeed(name, userId)))}
              className="h-8 rounded-sm font-mono text-[9px] uppercase tracking-[0.12em]"
            >
              <Shuffle className="size-3.5" /> Reset
            </Button>
          </div>
        </div>
      </div>

      <details className="group border border-border bg-muted/30 px-3 py-2">
        <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground group-open:text-foreground">
          Tweak the details
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Hair">
            <select
              value={config.hairStyle}
              onChange={(event) => patch({ hairStyle: event.target.value as (typeof HAIR)[number] })}
              className="h-9 w-full rounded-sm border border-border bg-background px-2 text-sm"
            >
              {HAIR.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Eyes">
            <select
              value={config.eyeStyle}
              onChange={(event) => patch({ eyeStyle: event.target.value as (typeof EYES)[number] })}
              className="h-9 w-full rounded-sm border border-border bg-background px-2 text-sm"
            >
              {EYES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Glasses">
            <select
              value={config.glassesStyle}
              onChange={(event) => patch({ glassesStyle: event.target.value as (typeof GLASSES)[number] })}
              className="h-9 w-full rounded-sm border border-border bg-background px-2 text-sm"
            >
              {GLASSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Shirt">
            <select
              value={config.shirtStyle}
              onChange={(event) => patch({ shirtStyle: event.target.value as (typeof SHIRTS)[number] })}
              className="h-9 w-full rounded-sm border border-border bg-background px-2 text-sm"
            >
              {SHIRTS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Look">
            <div className="flex gap-1.5">
              {(["man", "woman"] as const).map((sex) => (
                <button
                  key={sex}
                  type="button"
                  onClick={() => patch({ sex })}
                  aria-pressed={config.sex === sex}
                  className={cn(
                    "h-9 flex-1 rounded-sm border px-2 font-mono text-[9px] uppercase tracking-[0.1em]",
                    config.sex === sex
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {sex}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Background">
            <div className="flex flex-wrap gap-1.5">
              {BACKGROUNDS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => patch({ bgColor: color })}
                  aria-label={`Background ${color}`}
                  aria-pressed={config.bgColor === color}
                  className={cn(
                    "size-7 rounded-full border-2",
                    config.bgColor === color ? "border-foreground" : "border-transparent",
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </Field>
        </div>
      </details>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
