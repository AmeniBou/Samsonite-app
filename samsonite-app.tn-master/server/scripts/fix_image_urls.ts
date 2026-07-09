import 'dotenv/config';
import { prisma } from '../src/db/prisma';

const isLikelyImageUrl = (url: string) => /\.(jpe?g|png|webp|avif|gif)(?:[?#].*)?$/i.test(url) || /large_default|medium_default|home_default|thickbox_default/i.test(url);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const extractImageFromHtml = (html: string, baseUrl: string): string | null => {
  // Try og:image
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  if (og && og[1]) return new URL(og[1], baseUrl).toString();
  // twitter:image
  const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  if (tw && tw[1]) return new URL(tw[1], baseUrl).toString();
  // link rel=image_src
  const link = html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["'][^>]*>/i);
  if (link && link[1]) return new URL(link[1], baseUrl).toString();
  // Look for common product image URLs in html
  const img = html.match(/https?:\/\/(?:[^"'<>\s]+)\/(?:[\w-]+_)?(?:large_default|medium_default|home_default|thickbox_default|original)[^"'<>\s]*/i);
  if (img && img[0]) return img[0];
  // fallback: first <img src="...">
  const img2 = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (img2 && img2[1]) return new URL(img2[1], baseUrl).toString();
  return null;
};

(async () => {
  console.log('Starting image URL fixer...');
  const images = await prisma.productImage.findMany({ orderBy: { id: 'asc' } });
  console.log(`Found ${images.length} productImage rows`);

  const updates: Array<{ id: number; from: string; to: string }> = [];
  const failures: Array<{ id: number; url: string; reason: string }> = [];

  for (const img of images) {
    const url = img.imageUrl?.trim();
    if (!url) {
      failures.push({ id: img.id, url: '', reason: 'empty' });
      continue;
    }

    if (isLikelyImageUrl(url)) {
      // looks ok
      continue;
    }

    try {
      // fetch HEAD first
      let res: Response | null = null;
      try {
        res = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
      } catch (err) {
        failures.push({ id: img.id, url, reason: `fetch error: ${String(err)}` });
        await sleep(150);
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.startsWith('image/')) {
        // server returned image despite extension missing
        updates.push({ id: img.id, from: url, to: res.url });
        await prisma.productImage.update({ where: { id: img.id }, data: { imageUrl: res.url } });
        await sleep(120);
        continue;
      }

      if (contentType.startsWith('text/html')) {
        const text = await res.text();
        const found = extractImageFromHtml(text, res.url);
        if (found) {
          if (isLikelyImageUrl(found)) {
            updates.push({ id: img.id, from: url, to: found });
            await prisma.productImage.update({ where: { id: img.id }, data: { imageUrl: found } });
          } else {
            // found something but not clearly an image
            failures.push({ id: img.id, url, reason: `extracted not-image: ${found}` });
          }
        } else {
          failures.push({ id: img.id, url, reason: 'no image found in HTML' });
        }
        await sleep(200);
        continue;
      }

      failures.push({ id: img.id, url, reason: `unknown content-type: ${contentType}` });
    } catch (err) {
      failures.push({ id: img.id, url, reason: `error: ${String(err)}` });
    }
  }

  console.log('Updates:', updates.length);
  console.log('Failures:', failures.length);
  // write reports
  const fs = await import('fs');
  fs.writeFileSync('server/scripts/fix_image_urls_updates.json', JSON.stringify(updates, null, 2));
  fs.writeFileSync('server/scripts/fix_image_urls_failures.json', JSON.stringify(failures, null, 2));

  console.log('Done. Wrote reports to server/scripts/');
  await prisma.$disconnect();
})();
