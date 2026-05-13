// Per-character "decoding" reveal. Each scramble-able character cycles
// through random glyphs, then settles to its real value at a staggered
// time so the text reads as a left-to-right wave of hex/binary settling
// into legible content. Whitespace and non-alphanumerics pass through
// untouched, so addresses (`0x4f36...A6aE`), separators (`·`), arrows
// (`→`) and ellipses (`...`) keep their structure during the reveal.

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*<>/=+";

function isScramblable(ch: string): boolean {
  return /[A-Za-z0-9]/.test(ch);
}

function randomGlyph(): string {
  return CHARSET[(Math.random() * CHARSET.length) | 0];
}

export interface DecodeOptions {
  /** Total animation duration in ms. Default 620. */
  duration?: number;
  /** Start delay in ms before the animation begins. Default 0. */
  delay?: number;
  /** Called when the animation finishes (text fully settled). */
  onDone?: () => void;
}

/** Animate one Text-node-bearing element from a scrambled state to `final`.
 *  Returns a cancel function that stops the animation and restores `final`. */
export function decodeText(
  el: HTMLElement,
  final: string,
  opts: DecodeOptions = {}
): () => void {
  const duration = opts.duration ?? 620;
  const delay = opts.delay ?? 0;

  let cancelled = false;
  const startAt = performance.now() + delay;

  // Pre-compute per-character settle times so the wave is monotonic
  // left-to-right. The first character settles at 30% of the total
  // duration; the last at 100%. Non-scramble chars settle at t=0.
  const N = final.length;
  const settle: number[] = new Array(N);
  for (let i = 0; i < N; i++) {
    if (isScramblable(final[i])) {
      const frac = N <= 1 ? 1 : i / (N - 1);
      settle[i] = duration * (0.3 + 0.7 * frac);
    } else {
      settle[i] = 0;
    }
  }

  const tick = (now: number) => {
    if (cancelled) return;
    const elapsed = now - startAt;
    if (elapsed < 0) {
      // Pre-delay phase: render fully scrambled so the user never sees
      // the unscrambled SSR text peeking through during the delay.
      let scrambled = "";
      for (let i = 0; i < N; i++) {
        scrambled += isScramblable(final[i]) ? randomGlyph() : final[i];
      }
      el.textContent = scrambled;
      requestAnimationFrame(tick);
      return;
    }
    if (elapsed >= duration) {
      el.textContent = final;
      opts.onDone?.();
      return;
    }
    let out = "";
    for (let i = 0; i < N; i++) {
      const ch = final[i];
      if (!isScramblable(ch) || elapsed >= settle[i]) {
        out += ch;
      } else {
        out += randomGlyph();
      }
    }
    el.textContent = out;
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    el.textContent = final;
  };
}

/** Immediately overwrite an element's text with a scrambled placeholder
 *  so the real SSR content is never visible while waiting to reveal. */
export function preScramble(el: HTMLElement): string {
  const original = el.textContent ?? "";
  let scrambled = "";
  for (let i = 0; i < original.length; i++) {
    scrambled += isScramblable(original[i]) ? randomGlyph() : original[i];
  }
  el.textContent = scrambled;
  return original;
}
