import sharp from 'sharp';
import { readdir, readFile, writeFile } from 'node:fs/promises';
for (const file of await readdir('screenshots'))
  if (file.endsWith('.png')) {
    const path = `screenshots/${file}`;
    const original = await readFile(path);
    const compressed = await sharp(original)
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
    if (compressed.length < original.length) await writeFile(path, compressed);
  }
console.log('Losslessly optimized screenshot PNGs.');
