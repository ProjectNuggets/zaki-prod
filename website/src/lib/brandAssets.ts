/**
 * Brand Asset Registry
 * Classifies all usable images from public/slides/ and public/assets/
 * for structured integration across Home and ZAKI pages.
 */

export type BrandAssetRole = "hero" | "chat" | "bot" | "texture";

export type BrandAsset = {
  src: string;
  alt: string;
  role: BrandAssetRole;
  localeSafe: boolean;
};

/**
 * Asset audit notes:
 * - /slides/1-6.png: Product screenshots / branded slides from GSAP-era site
 *   1.png: Hero-grade — ZAKI product overview / brand hero
 *   2.png: Chat workspace — shows spaces UI
 *   3.png: Bot/operator — darker technical view
 *   4.png: Feature detail — supporting
 *   5.png: Mobile/responsive view — supporting
 *   6.png: Brand summary / closing — editorial
 *
 * - /assets/*.webp, *.png, *.svg: Mixed brand textures, logos, UI fragments
 *   nova-nuggets-logo.png: Company logo
 *   newsroom-bg.png, newsroom-pattern.svg: Editorial textures
 *   footer-loop.mp4: Video asset (excluded from image system)
 *
 * Excluded: duplicate files (1)/(2) variants, JS/CSS build artifacts
 */

export const brandAssets = {
  heroPrimary: {
    src: "/slides/1.png",
    alt: "ZAKI AI product experience — hero overview",
    role: "hero" as const,
    localeSafe: true,
  },
  heroSecondary: {
    src: "/slides/6.png",
    alt: "ZAKI AI brand identity",
    role: "hero" as const,
    localeSafe: true,
  },
  chat: [
    {
      src: "/slides/2.png",
      alt: "Spaces workspace with organized projects",
      role: "chat" as const,
      localeSafe: true,
    },
    {
      src: "/slides/4.png",
      alt: "Spaces feature detail view",
      role: "chat" as const,
      localeSafe: true,
    },
  ],
  bot: [
    {
      src: "/slides/3.png",
      alt: "ZAKI operator — persistent AI runtime",
      role: "bot" as const,
      localeSafe: true,
    },
    {
      src: "/slides/5.png",
      alt: "ZAKI mobile operator view",
      role: "bot" as const,
      localeSafe: true,
    },
  ],
  textures: [
    {
      src: "/assets/newsroom-pattern.svg",
      alt: "",
      role: "texture" as const,
      localeSafe: true,
    },
  ],
};
