/**
 * Brand + store configuration.
 *
 * Everything the brand owner is expected to change lives here (and in
 * `src/data/catalog.ts` / `src/config/customization.ts`). Values marked
 * PLACEHOLDER have not been confirmed by the brand and must be replaced
 * before launch.
 */

export const site = {
  name: "CUSTOM ME",
  /** The brand line. Each phrase is also owned by one product category. */
  line: ["Your world.", "Your design.", "Your rules."] as const,
  description:
    "Custom-designed art bags, laptop sleeves, T-ruler cases and notebooks — graphic objects you can make your own.",

  /**
   * Logo: put the original logo artwork in `public/brand/` and point `src`
   * at it (with its intrinsic size). While `logo` is `null`, a clearly
   * marked placeholder wordmark is rendered instead — it is NOT the brand's
   * logo and must not ship.
   * Example: { src: "/brand/logo.png", width: 1200, height: 800 }
   */
  // The two logo layers of assets/final logo.psd, unchanged, on transparent
  logo: { src: "/brand/logo.png", width: 594, height: 336 } as { src: string; width: number; height: number } | null,
  /** Version of the logo for navy backgrounds (footer). Without one, the logo sits on a paper plate there. */
  logoOnDark: null as { src: string; width: number; height: number } | null,
  logoAlt: "CUSTOM ME",

  /** Social / contact. `null` hides the link everywhere. PLACEHOLDER. */
  instagram: null as string | null, // e.g. "https://instagram.com/<handle>"
  instagramHandle: null as string | null, // e.g. "@custom.me"

  currency: {
    code: "EGP", // PLACEHOLDER — confirm market currency
    locale: "en-EG",
  },
} as const;
