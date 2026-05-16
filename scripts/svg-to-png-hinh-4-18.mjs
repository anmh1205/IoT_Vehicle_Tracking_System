import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const svgPath = resolve(
  'resources/reports/thesis/final/assets/figures-condensed-r2/10-chuong-4-ket-qua-do-luong-hinh-4-23.svg',
);
const pngPath = svgPath.replace(/\.svg$/, '.png');

const svgBuffer = readFileSync(svgPath);

const outputBuffer = await sharp(svgBuffer, { density: 300 })
  .resize({ width: 1600 })
  .png({ compressionLevel: 9 })
  .toBuffer();

writeFileSync(pngPath, outputBuffer);
console.log(`Wrote ${pngPath} (${outputBuffer.length} bytes)`);
