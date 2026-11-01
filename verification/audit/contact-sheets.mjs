import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

for (const width of [360, 390, 768, 1024, 1440]) {
  const images = await Promise.all(
    ['home', 'jobs', 'detail', 'login', 'dashboard-preview'].map(async (page) => {
      const buffer = await sharp(`screenshots/audit/${page}-${width}.png`).resize({ width: 320 }).png().toBuffer();
      return { buffer, metadata: await sharp(buffer).metadata() };
    }),
  );
  const height = Math.max(...images.map(({ metadata }) => metadata.height));
  const sheet = await sharp({ create: { width: 1600, height, channels: 3, background: '#d9ded9' } })
    .composite(images.map(({ buffer }, index) => ({ input: buffer, left: index * 320, top: 0 })))
    .png().toBuffer();
  await writeFile(`screenshots/audit/sheet-${width}.png`, sheet);
}
console.log('Wrote five contact sheets: home, jobs, detail, login, demo dashboard.');
