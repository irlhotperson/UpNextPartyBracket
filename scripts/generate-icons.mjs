import sharp from "sharp";
import { writeFileSync } from "fs";

// Stacked "UN" monogram — pixel font style rendered with sharp
// U on top, N below, vertical strokes aligned, arcade yellow + magenta shadow

function renderIconSvg(size) {
  const fontSize = Math.round(size * 0.38);
  const shadowOffset = Math.round(size * 0.007 * 4); // 3-4px at 512
  const radius = Math.round(size * 0.1875); // iOS rounded square
  const borderWidth = Math.max(1, Math.round(size * 0.008));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#0a0e1a"/>
  <rect x="${borderWidth * 2}" y="${borderWidth * 2}" width="${size - borderWidth * 4}" height="${size - borderWidth * 4}" rx="${radius - borderWidth * 2}" ry="${radius - borderWidth * 2}" fill="none" stroke="#1a6dff" stroke-width="${borderWidth}" opacity="0.3"/>
  <text x="${size / 2 + shadowOffset}" y="${size * 0.43 + shadowOffset}" font-family="'Courier New', monospace" font-weight="bold" font-size="${fontSize}" fill="#ff2d9b" text-anchor="middle" dominant-baseline="central">U</text>
  <text x="${size / 2 + shadowOffset}" y="${size * 0.73 + shadowOffset}" font-family="'Courier New', monospace" font-weight="bold" font-size="${fontSize}" fill="#ff2d9b" text-anchor="middle" dominant-baseline="central">N</text>
  <text x="${size / 2}" y="${size * 0.43}" font-family="'Courier New', monospace" font-weight="bold" font-size="${fontSize}" fill="#ffd700" text-anchor="middle" dominant-baseline="central">U</text>
  <text x="${size / 2}" y="${size * 0.73}" font-family="'Courier New', monospace" font-weight="bold" font-size="${fontSize}" fill="#ffd700" text-anchor="middle" dominant-baseline="central">N</text>
</svg>`;
}

async function generateIcons() {
  const sizes = [
    { name: "icon-192.png", size: 192 },
    { name: "icon-512.png", size: 512 },
    { name: "apple-touch-icon.png", size: 180 },
  ];

  for (const { name, size } of sizes) {
    const svg = renderIconSvg(size);
    await sharp(Buffer.from(svg)).png().toFile(`public/${name}`);
    console.log(`Generated ${name} (${size}x${size})`);
  }

  // Favicon: multi-res ICO (generate 48px PNG, browsers handle the rest)
  const favicon48 = renderIconSvg(48);
  await sharp(Buffer.from(favicon48)).png().toFile("public/favicon.ico");
  console.log("Generated favicon.ico (48x48)");

  // Also generate 32px and 16px PNGs for the ICO
  const favicon32 = renderIconSvg(32);
  await sharp(Buffer.from(favicon32)).png().toFile("public/icon-32.png");
  console.log("Generated icon-32.png (32x32)");

  const favicon16 = renderIconSvg(16);
  await sharp(Buffer.from(favicon16)).png().toFile("public/icon-16.png");
  console.log("Generated icon-16.png (16x16)");
}

generateIcons().catch(console.error);
