import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { prisma } from "../src/db/prisma";

const OUTPUT_BASE_DIR = path.resolve(process.cwd(), "public", "images", "products");
const FETCH_RETRIES = 4;
const RETRY_DELAY_MS = 2500;

const normalizeUrl = (value: string): string => value.trim();

const isRemoteUrl = (value: string) => /^https?:\/\//i.test(value);

const imageExtensionFromContentType = (contentType: string): string => {
  const type = contentType.split(";")[0].trim().toLowerCase();
  if (type === "image/jpeg" || type === "image/jpg") return ".jpg";
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "image/avif") return ".avif";
  if (type === "image/gif") return ".gif";
  if (type === "image/svg+xml") return ".svg";
  return ".jpg";
};

const extensionFromUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const ext = path.extname(parsed.pathname).toLowerCase();
    if (ext && /^\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(ext)) {
      return ext === ".jpeg" ? ".jpg" : ext;
    }
  } catch {
    // fallback
  }
  return null;
};

const getOutputPath = (productId: number, fileName: string) =>
  path.join(OUTPUT_BASE_DIR, String(productId), fileName);

const getPublicUrl = (productId: number, fileName: string) =>
  `/images/products/${productId}/${fileName}`;

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const downloadImage = async (url: string, outputPath: string): Promise<string> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < FETCH_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          Accept:
            "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Referer: "https://samsonite.com.tn/",
        },
      });

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} ${response.statusText}`);
        if (response.status >= 500 && response.status < 600 && attempt < FETCH_RETRIES - 1) {
          await delay(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
        throw lastError;
      }

      const contentType = response.headers.get("content-type") || "";
      const extFromUrl = extensionFromUrl(url);
      const ext = extFromUrl || imageExtensionFromContentType(contentType);
      const finalPath = outputPath.endsWith(ext) ? outputPath : `${outputPath}${ext}`;

      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(finalPath, buffer);
      return finalPath;
    } catch (err) {
      lastError = err;
      if (attempt < FETCH_RETRIES - 1) {
        await delay(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw lastError;
};

const main = async () => {
  console.log("Starting image download process...");
  console.log(`Saving images to ${OUTPUT_BASE_DIR}`);

  await ensureDir(OUTPUT_BASE_DIR);

  const productImages = await prisma.productImage.findMany({
    orderBy: [{ productId: "asc" }, { position: "asc" }],
  });

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  const failures: Array<{ id: number; url: string; reason: string }> = [];

  for (const img of productImages) {
    const url = normalizeUrl(img.imageUrl || "");
    if (!url) {
      console.warn(`Skipping productImage ${img.id} because imageUrl is empty`);
      failures.push({ id: img.id, url: "", reason: "empty" });
      failed += 1;
      continue;
    }

    const productDir = path.join(OUTPUT_BASE_DIR, String(img.productId));
    await ensureDir(productDir);

    if (!isRemoteUrl(url) && url.startsWith("/images/products/")) {
      const localPath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
      try {
        await fs.access(localPath);
        skipped += 1;
        continue;
      } catch {
        // file missing, proceed to treat it as outdated
      }
    }

    if (!isRemoteUrl(url)) {
      console.warn(`Skipping productImage ${img.id}; URL is not remote and not a local /images path: ${url}`);
      failures.push({ id: img.id, url, reason: "invalid-url" });
      failed += 1;
      continue;
    }

    const fileName = `${img.id}${extensionFromUrl(url) || ".jpg"}`;
    const outputPath = getOutputPath(img.productId, fileName);
    try {
      const savedPath = await downloadImage(url, outputPath);
      const finalFileName = path.basename(savedPath);
      const publicUrl = getPublicUrl(img.productId, finalFileName);
      await prisma.productImage.update({
        where: { id: img.id },
        data: { imageUrl: publicUrl },
      });
      downloaded += 1;
      console.log(`Downloaded ${url} -> ${publicUrl}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`Failed to download image ${url} for productImage ${img.id}:`, reason);
      failures.push({ id: img.id, url, reason });
      failed += 1;
    }
  }

  if (failures.length) {
    await fs.writeFile(
      path.join(process.cwd(), "server", "scripts", "download_product_images_failures.json"),
      JSON.stringify(failures, null, 2)
    );
    console.log(`Wrote ${failures.length} failures to server/scripts/download_product_images_failures.json`);
  }

  console.log(`Done. downloaded=${downloaded}, skipped=${skipped}, failed=${failed}`);
  await prisma.$disconnect();
};

main().catch((err) => {
  console.error("Fatal error during download:", err);
  process.exit(1);
});
