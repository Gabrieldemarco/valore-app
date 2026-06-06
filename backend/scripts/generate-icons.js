const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const PUBLIC_DIR = path.resolve(__dirname, '..', '..', 'frontend-vite', 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');

const SIZES = [
  { name: 'favicon', size: 48 },
  { name: 'icon-192', size: 192 },
  { name: 'icon-512', size: 512 },
  { name: 'apple-touch-icon', size: 180 },
];

const SVG_INLINE = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#0a0a0c"/>
  <path d="M 96 66 L 226 66 L 200 106 L 256 400 L 346 106 L 326 66 L 396 66 L 376 106 L 282 446 L 216 446 L 120 106 Z" fill="#c5a880"/>
</svg>`;

async function generate() {
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  for (const { name, size } of SIZES) {
    const outputPath = path.join(ICONS_DIR, `${name}.png`);
    await sharp(Buffer.from(SVG_INLINE))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Generated ${outputPath} (${size}x${size})`);
  }

  await sharp(Buffer.from(SVG_INLINE))
    .resize(48, 48)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'favicon.png'));

  console.log('Done! All PNG icons generated.');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
