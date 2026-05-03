import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const logoPath = join(__dirname, '../artifacts/arc-website/public/images/logo-asa.jpg');
const outputPath = join(__dirname, '../artifacts/arc-website/public/opengraph.jpg');

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const LOGO_MAX_WIDTH = 600;
const LOGO_MAX_HEIGHT = 400;

const logoBuffer = readFileSync(logoPath);

const logoMeta = await sharp(logoBuffer).metadata();
const logoAspect = logoMeta.width / logoMeta.height;

let logoWidth = LOGO_MAX_WIDTH;
let logoHeight = Math.round(LOGO_MAX_WIDTH / logoAspect);
if (logoHeight > LOGO_MAX_HEIGHT) {
  logoHeight = LOGO_MAX_HEIGHT;
  logoWidth = Math.round(LOGO_MAX_HEIGHT * logoAspect);
}

const resizedLogo = await sharp(logoBuffer)
  .resize(logoWidth, logoHeight, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .toBuffer();

const left = Math.round((OG_WIDTH - logoWidth) / 2);
const top = Math.round((OG_HEIGHT - logoHeight) / 2);

await sharp({
  create: {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    channels: 3,
    background: { r: 255, g: 255, b: 255 },
  },
})
  .composite([{ input: resizedLogo, left, top }])
  .jpeg({ quality: 90 })
  .toFile(outputPath);

console.log(`Generated OG image: ${OG_WIDTH}x${OG_HEIGHT} -> ${outputPath}`);
