"use client";

import { useEffect, useLayoutEffect } from "react";
import { decodeText, preScramble } from "@/lib/decode";

// Use the layout effect during render so the scramble runs synchronously
// before the browser paints the hydrated content -- this kills the flash
// of unscrambled SSR text on above-the-fold cards. Falls back to useEffect
// when window is undefined (SSR no-op).
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Orchestrates the terminal-decoding reveal across all .module-row cards.
 *  Renders nothing. Place once inside the modules section. */
export function ModuleReveal() {
  useIsoLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // Honour the OS preference: leave the SSR content alone, do not
      // animate, do not trigger the scanline.
      return;
    }

    const rows = Array.from(
      document.querySelectorAll<HTMLElement>(".module-row")
    );
    if (rows.length === 0) return;

    // Snapshot every decode-target's real text and immediately scramble it,
    // synchronously, BEFORE the browser paints. Each row stores the originals
    // on its target elements via dataset.original.
    const targetsByRow = new Map<HTMLElement, HTMLElement[]>();
    rows.forEach((row) => {
      const targets = Array.from(
        row.querySelectorAll<HTMLElement>("[data-decode]")
      );
      targets.forEach((t) => {
        if (t.dataset.original === undefined) {
          const original = preScramble(t);
          t.dataset.original = original;
        }
      });
      targetsByRow.set(row, targets);
    });

    // The reveal: stagger ATTACK column 0ms, FIX column 90ms, between
    // adjacent characters via the per-character settle wave inside decodeText.
    const cancellers: Array<() => void> = [];
    const reveal = (row: HTMLElement) => {
      if (row.dataset.revealed === "1") return;
      row.dataset.revealed = "1";
      const targets = targetsByRow.get(row) ?? [];
      targets.forEach((t) => {
        const original = t.dataset.original ?? t.textContent ?? "";
        const colOffset = t.closest(".fix-col") ? 140 : 0;
        const groupDelay = Number(t.dataset.decodeDelay ?? "0");
        // Body copy gets a longer settle than headers so the wave reads
        // as deliberate, not flickery.
        const isBody = t.classList.contains("col-body");
        const cancel = decodeText(t, original, {
          duration: isBody ? 1200 : 900,
          delay: colOffset + groupDelay,
        });
        cancellers.push(cancel);
      });
    };

    // Inter-card stagger: 70ms between cards as they enter the viewport in
    // document order. We track a queue head so cards entering simultaneously
    // (e.g. above-the-fold on first paint) still stagger smoothly.
    let queueHead = performance.now();
    const STAGGER_MS = 110;

    const io = new IntersectionObserver(
      (entries) => {
        entries
          .filter((e) => e.isIntersecting)
          // Sort by document order so a fast scroll doesn't reveal bottom
          // cards before top ones.
          .sort(
            (a, b) =>
              rows.indexOf(a.target as HTMLElement) -
              rows.indexOf(b.target as HTMLElement)
          )
          .forEach((entry) => {
            const row = entry.target as HTMLElement;
            io.unobserve(row);
            const now = performance.now();
            const startAt = Math.max(now, queueHead);
            queueHead = startAt + STAGGER_MS;
            const wait = startAt - now;
            if (wait <= 0) reveal(row);
            else window.setTimeout(() => reveal(row), wait);
          });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.18 }
    );
    rows.forEach((row) => io.observe(row));

    return () => {
      io.disconnect();
      cancellers.forEach((c) => c());
      // Restore originals if we unmount mid-reveal (HMR, route change).
      rows.forEach((row) => {
        const targets = targetsByRow.get(row) ?? [];
        targets.forEach((t) => {
          const original = t.dataset.original;
          if (original !== undefined) t.textContent = original;
        });
      });
    };
  }, []);

  return null;
}
