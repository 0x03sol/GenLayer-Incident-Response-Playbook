"use client";

import { useEffect, useLayoutEffect } from "react";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Drives two coordinated effects on the side-by-side `.code-pair`:
 *
 *  A) Once-per-scroll-in synchronized scanline sweep with a typewriter
 *     consensus badge in each panel ("> consensus failed · validators
 *     diverged" / "> consensus reached · all validators agree").
 *
 *  B) Hover/focus-link: hovering any line in either panel highlights the
 *     same line index in the OTHER panel and dims everything else, making
 *     it materially easier to read the diff. Compounds on every hover.
 *
 *  Renders nothing. Place once on the module page, after the .code-pair
 *  is in the DOM. Respects prefers-reduced-motion (skips animations,
 *  keeps hover-link as an instant state change). */
export function CodeDiffOverlay() {
  useIsoLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const pair = document.querySelector<HTMLElement>(".code-pair");
    if (!pair) return;
    const panels = Array.from(
      pair.querySelectorAll<HTMLElement>(".code-panel[data-variant]")
    );
    if (panels.length < 2) return;

    /* ---------- A. Scanline + consensus typewriter (once) ---------- */

    const consensusEls = panels.map((p) =>
      p.querySelector<HTMLElement>(".consensus-text")
    );

    // Pre-clear the SSR'd consensus text synchronously so the typewriter
    // starts from empty -- but only when motion is allowed. Reduced-motion
    // users keep the SSR'd text intact.
    if (!reduced) {
      consensusEls.forEach((el) => {
        if (!el) return;
        if (el.dataset.original === undefined) {
          el.dataset.original = el.textContent ?? "";
          el.textContent = "";
        }
      });
    }

    const cleaners: Array<() => void> = [];

    const reveal = () => {
      if (pair.dataset.revealed === "1") return;
      pair.dataset.revealed = "1";
      panels.forEach((p) => {
        p.dataset.revealed = "1";
      });

      if (reduced) return;

      // Type the consensus badge text into each panel. Both panels start
      // together so the eye reads them as one synchronized verdict.
      consensusEls.forEach((el) => {
        if (!el) return;
        const final = el.dataset.original ?? "";
        if (!final) return;
        let i = 0;
        const STEP_MS = 22; // ~880ms for ~40 chars
        // Small lead-in so the scanline starts before text appears.
        const startTimer = window.setTimeout(() => {
          const interval = window.setInterval(() => {
            i += 1;
            el.textContent = final.slice(0, i);
            if (i >= final.length) {
              window.clearInterval(interval);
              el.dataset.typed = "1";
            }
          }, STEP_MS);
          cleaners.push(() => window.clearInterval(interval));
        }, 350);
        cleaners.push(() => window.clearTimeout(startTimer));
      });
    };

    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              reveal();
              io?.disconnect();
              break;
            }
          }
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.15 }
      );
      io.observe(pair);
    } else {
      // No IO: reveal immediately.
      reveal();
    }

    /* ---------- B. Hover/focus-link cross-highlight (delegated) ---------- */

    const indexOfPanel = new Map<HTMLElement, number>(
      panels.map((p, i) => [p, i])
    );

    const setActive = (lineIndex: number, source: HTMLElement) => {
      panels.forEach((panel) => {
        const lines = panel.querySelectorAll<HTMLElement>(
          `.line[data-line-index="${lineIndex}"], .ln[data-line-index="${lineIndex}"]`
        );
        lines.forEach((el) => el.classList.add("is-active-line"));
      });
      pair.classList.add("is-dim-others");
      // For symmetry: also tag the source panel so its own line is fully
      // visible (this is already true because of is-active-line, but keeping
      // a class on the source panel lets the cross-panel line use a
      // different muted tone if we ever need it).
      const sourceIdx = indexOfPanel.get(source);
      if (sourceIdx !== undefined) {
        pair.dataset.linkSource = String(sourceIdx);
      }
    };

    const clearActive = () => {
      pair.classList.remove("is-dim-others");
      delete pair.dataset.linkSource;
      panels.forEach((panel) => {
        panel
          .querySelectorAll<HTMLElement>(".is-active-line")
          .forEach((el) => el.classList.remove("is-active-line"));
      });
    };

    const findLineIndex = (target: EventTarget | null): {
      idx: number;
      panel: HTMLElement;
    } | null => {
      if (!(target instanceof HTMLElement)) return null;
      const lineEl = target.closest<HTMLElement>("[data-line-index]");
      if (!lineEl) return null;
      const panel = lineEl.closest<HTMLElement>(".code-panel");
      if (!panel) return null;
      const idx = Number(lineEl.dataset.lineIndex);
      if (!Number.isFinite(idx) || idx <= 0) return null;
      return { idx, panel };
    };

    const onMouseOver = (e: MouseEvent) => {
      const hit = findLineIndex(e.target);
      if (!hit) return;
      setActive(hit.idx, hit.panel);
    };
    const onMouseLeave = () => clearActive();

    pair.addEventListener("mouseover", onMouseOver);
    pair.addEventListener("mouseleave", onMouseLeave);

    cleaners.push(() => pair.removeEventListener("mouseover", onMouseOver));
    cleaners.push(() => pair.removeEventListener("mouseleave", onMouseLeave));

    return () => {
      io?.disconnect();
      cleaners.forEach((c) => c());
      // Restore SSR'd consensus text if we unmount mid-type (HMR, route).
      consensusEls.forEach((el) => {
        if (el && el.dataset.original !== undefined) {
          el.textContent = el.dataset.original;
        }
      });
      clearActive();
    };
  }, []);

  return null;
}
