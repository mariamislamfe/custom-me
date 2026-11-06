/**
 * The CUSTOM ME mark vocabulary. Five hand-drawn marks, reused everywhere:
 *
 *   crown   — status / "this one is yours"
 *   spark   — accent, sparingly
 *   arrow   — direction, calls to action
 *   under   — emphasis (animated underline)
 *   loop    — selection (a pen circle drawn around the chosen thing)
 *
 * Each is authored in its own small viewBox and kept slightly imperfect so it
 * reads as drawn, not generated.
 */

export const MARKS = {
  crown: {
    viewBox: "0 0 100 78",
    // Slightly wobbly three-point crown + band.
    d: "M10 62 L6 20 L29 42 L49 7 L71 41 L95 17 L90 62 Q50 57 10 62 Z",
    band: "M11 71 Q50 64 89 71",
  },
  spark: {
    viewBox: "0 0 100 100",
    d: "M50 2 C53 36 64 47 98 50 C64 54 53 64 50 98 C46 64 36 54 2 50 C36 46 46 36 50 2 Z",
  },
  arrow: {
    viewBox: "0 0 120 70",
    d: "M6 58 C30 26 64 12 108 22",
    head: "M90 8 L109 22 L89 37",
  },
  under: {
    viewBox: "0 0 300 24",
    d: "M4 15 C40 6 72 20 112 12 S190 5 230 13 S282 12 296 9",
  },
  loop: {
    viewBox: "0 0 120 80",
    d: "M64 6 C26 4 6 20 7 40 C8 62 38 74 70 71 C100 68 116 50 113 30 C110 11 82 3 50 9",
  },
} as const;
