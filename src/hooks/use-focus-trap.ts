"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTORS = [
  "a[href]:not([disabled])",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Traps keyboard focus within the referenced element while `active` is true.
 * - On activate: moves focus to the first focusable element inside the container.
 * - On Tab/Shift+Tab: cycles focus within the container.
 * - On deactivate: restores focus to the element that was focused when the trap activated.
 * - Also locks body scroll while active (so the page beneath the modal does not move).
 */
export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  options: { lockScroll?: boolean; onEscape?: () => void } = {}
) {
  const containerRef = useRef<T>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const { lockScroll = true, onEscape } = options;

  useEffect(() => {
    if (!active) return;

    // Remember the element that had focus so we can restore it on close.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    restoreFocusRef.current = previouslyFocused;

    const container = containerRef.current;
    if (!container) return;

    // Lock body scroll.
    let originalOverflow: string | null = null;
    if (lockScroll) {
      const body = document.body;
      originalOverflow = body.style.overflow;
      body.style.overflow = "hidden";
    }

    // Move initial focus to first focusable element (or container itself).
    const focusables = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    ).filter(
      (el) => !el.hasAttribute("aria-hidden") && el.offsetParent !== null
    );

    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      container.setAttribute("tabindex", "-1");
      container.focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onEscape?.();
        return;
      }
      if (e.key !== "Tab") return;

      const node = containerRef.current;
      if (!node) return;

      const items = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      ).filter((el) => !el.hasAttribute("aria-hidden") && el.offsetParent !== null);

      if (items.length === 0) {
        e.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (activeEl === first || !node.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (activeEl === last || !node.contains(activeEl)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (lockScroll) {
        document.body.style.overflow = originalOverflow ?? "";
      }
      // Restore focus to the element that opened the modal.
      const previous = restoreFocusRef.current;
      if (previous && typeof previous.focus === "function") {
        previous.focus();
      }
    };
  }, [active, lockScroll, onEscape]);

  return containerRef;
}
