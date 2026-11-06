// Makes the site and dashboard icons from the brand logo: npm run icons
//
// The logo (public/brand/logo.png, unchanged) centred on a paper tile: the
// browser tab icon, the phone home-screen icons and the dashboard app icons.
// The notification badge stays the plain white crown: Android shows badges
// as a single-colour silhouette, which the full logo can't survive.
import sharp from "sharp";

const LOGO = "public/brand/logo.png";
const PAPER = "#F4F4F2";

async function tile(size, file, pad = 0.12) {
  const inner = Math.round(size * (1 - pad * 2));
  const logo = await sharp(LOGO).resize(inner, inner, { fit: "inside" }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: PAPER } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(file);
}

await tile(192, "public/dashboard-icon-192.png");
await tile(512, "public/dashboard-icon-512.png");
await tile(512, "src/app/icon.png", 0.06);
await tile(180, "src/app/apple-icon.png");

const crown = `<path d="M10 62 L6 20 L29 42 L49 7 L71 41 L95 17 L90 62 Q50 57 10 62 Z" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linejoin="round"/>
<path d="M11 71 Q50 64 89 71" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round"/>`;
const badge = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 100 100">
<g transform="translate(8 12) scale(0.84)">${crown}</g>
</svg>`;
await sharp(Buffer.from(badge)).png().toFile("public/dashboard-badge.png");
console.log("✓ icons in public/ and src/app/");
