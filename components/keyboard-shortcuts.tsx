"use client";

import { useEffect, useRef } from "react";

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

/** HN-style keyboard navigation, scoped to the feed. */
export function KeyboardShortcuts() {
  const indexRef = useRef(-1);

  useEffect(() => {
    const rows = () => Array.from(document.querySelectorAll<HTMLElement>("[data-feed-item]"));

    const select = (index: number) => {
      const items = rows();
      if (!items.length) return;
      indexRef.current = Math.max(0, Math.min(items.length - 1, index));
      items.forEach((el, i) => el.classList.toggle("kb-selected", i === indexRef.current));
      items[indexRef.current]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;

      const key = event.key.toLowerCase();
      const current = rows()[indexRef.current];

      if (key === "/") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>("[data-search-input]")?.focus();
        return;
      }
      if (key === "j") {
        event.preventDefault();
        select(indexRef.current + 1);
        return;
      }
      if (key === "k") {
        event.preventDefault();
        select(indexRef.current - 1);
        return;
      }
      if (key === "escape") {
        rows().forEach((el) => el.classList.remove("kb-selected"));
        indexRef.current = -1;
        return;
      }
      if (!current) return;
      if (key === "o" || key === "enter") {
        event.preventDefault();
        current.querySelector<HTMLAnchorElement>("[data-item-link]")?.click();
      } else if (key === "l") {
        event.preventDefault();
        current.querySelector<HTMLButtonElement>("[data-like-button]")?.click();
      } else if (key === "d") {
        event.preventDefault();
        current.querySelector<HTMLButtonElement>("[data-dislike-button]")?.click();
      } else if (key === "c") {
        event.preventDefault();
        current.querySelector<HTMLAnchorElement>("[data-comment-link]")?.click();
      } else if (key === "s") {
        event.preventDefault();
        current.querySelector<HTMLButtonElement>("[data-save-button]")?.click();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
