/**
 * Motion system. Two easings, three durations, one "draw" behaviour.
 *
 *  ink  — symmetrical, for lines being drawn and things crossing the screen
 *  snap — fast out, soft landing, for UI responding to the user
 */
export const ease = {
  ink: [0.65, 0, 0.35, 1] as const,
  snap: [0.16, 1, 0.3, 1] as const,
};

export const dur = {
  quick: 0.22,
  base: 0.5,
  draw: 0.9,
};

/** Spring for physical things: cards, products, drawers. */
export const spring = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 } as const;

/** Standard entrance used by sections and product details. */
export const rise = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: dur.base, ease: ease.snap },
};
