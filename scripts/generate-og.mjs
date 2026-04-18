import sharp from "sharp";

// OG Image: 1200x630, dark background with scanlines, stacked "UP NEXT",
// "PARTY BRACKET" tagline, corner pixel motifs, faint VS watermark

function generateScanlines(width, height) {
  let lines = "";
  for (let y = 0; y < height; y += 3) {
    lines += `<rect x="0" y="${y}" width="${width}" height="1" fill="black" opacity="0.12"/>`;
  }
  return lines;
}

function generateOgSvg() {
  const w = 1200;
  const h = 630;
  const scanlines = generateScanlines(w, h);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <!-- Background -->
  <rect width="${w}" height="${h}" fill="#060810"/>

  <!-- Radial glow -->
  <radialGradient id="glow" cx="50%" cy="45%" r="50%">
    <stop offset="0%" stop-color="#1a6dff" stop-opacity="0.15"/>
    <stop offset="100%" stop-color="#060810" stop-opacity="0"/>
  </radialGradient>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>

  <!-- Faint VS watermark -->
  <text x="600" y="340" font-family="'Courier New', monospace" font-weight="bold" font-size="400" fill="#1a6dff" text-anchor="middle" dominant-baseline="central" opacity="0.06">VS</text>

  <!-- Corner pixel motifs — top left -->
  <rect x="30" y="30" width="40" height="4" fill="#1a6dff" opacity="0.5"/>
  <rect x="30" y="30" width="4" height="40" fill="#1a6dff" opacity="0.5"/>

  <!-- Top right -->
  <rect x="${w - 70}" y="30" width="40" height="4" fill="#1a6dff" opacity="0.5"/>
  <rect x="${w - 34}" y="30" width="4" height="40" fill="#1a6dff" opacity="0.5"/>

  <!-- Bottom left -->
  <rect x="30" y="${h - 34}" width="40" height="4" fill="#1a6dff" opacity="0.5"/>
  <rect x="30" y="${h - 70}" width="4" height="40" fill="#1a6dff" opacity="0.5"/>

  <!-- Bottom right -->
  <rect x="${w - 70}" y="${h - 34}" width="40" height="4" fill="#1a6dff" opacity="0.5"/>
  <rect x="${w - 34}" y="${h - 70}" width="4" height="40" fill="#1a6dff" opacity="0.5"/>

  <!-- "UP" — magenta shadow -->
  <text x="604" y="210" font-family="'Courier New', monospace" font-weight="bold" font-size="160" fill="#ff2d9b" text-anchor="middle" dominant-baseline="central">UP</text>
  <!-- "UP" — yellow -->
  <text x="600" y="206" font-family="'Courier New', monospace" font-weight="bold" font-size="160" fill="#ffd700" text-anchor="middle" dominant-baseline="central">UP</text>

  <!-- "NEXT" — magenta shadow -->
  <text x="604" y="360" font-family="'Courier New', monospace" font-weight="bold" font-size="160" fill="#ff2d9b" text-anchor="middle" dominant-baseline="central">NEXT</text>
  <!-- "NEXT" — yellow -->
  <text x="600" y="356" font-family="'Courier New', monospace" font-weight="bold" font-size="160" fill="#ffd700" text-anchor="middle" dominant-baseline="central">NEXT</text>

  <!-- "PARTY BRACKET" tagline -->
  <text x="600" y="480" font-family="'Courier New', monospace" font-size="36" fill="#00e5ff" text-anchor="middle" dominant-baseline="central" letter-spacing="8">PARTY BRACKET</text>

  <!-- Scanlines overlay -->
  ${scanlines}
</svg>`;
}

async function generateOg() {
  const svg = generateOgSvg();
  await sharp(Buffer.from(svg))
    .png({ quality: 90 })
    .toFile("public/og-image.png");
  console.log("Generated og-image.png (1200x630)");
}

generateOg().catch(console.error);
