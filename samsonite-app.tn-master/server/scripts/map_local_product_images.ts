import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../src/db/prisma";

type Options = {
  sourceDir: string;
  targetDir: string;
  apply: boolean;
  copy: boolean;
};

type LocalImage = {
  absolutePath: string;
  fileName: string;
  parentName: string;
};

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(scriptDir, "..");
const defaultTargetDir = path.join(serverRoot, "public", "images", "products");

const usage = `
Usage:
  npx tsx scripts/map_local_product_images.ts [--source <dir>] [--copy] [--apply]

Scans local image files, matches product_<id> file names to Product.scrapedId,
and updates ProductImage.imageUrl to /images/products/<productId>/<file>.

Defaults to dry-run mode. Add --apply to write database changes.
Use --copy when --source points outside public/images/products and files should be
copied into public/images/products/<productId>/ before DB URLs are updated.
`;

const parseArgs = (): Options => {
  const args = process.argv.slice(2);
  let sourceDir = defaultTargetDir;
  let targetDir = defaultTargetDir;
  let apply = false;
  let copy = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--source") {
      const value = args[index + 1];
      if (!value) throw new Error("--source requires a directory path");
      sourceDir = path.resolve(process.cwd(), value);
      index += 1;
      continue;
    }
    if (arg === "--target") {
      const value = args[index + 1];
      if (!value) throw new Error("--target requires a directory path");
      targetDir = path.resolve(process.cwd(), value);
      index += 1;
      continue;
    }
    if (arg === "--apply") {
      apply = true;
      continue;
    }
    if (arg === "--copy") {
      copy = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(usage.trim());
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { sourceDir, targetDir, apply, copy };
};

const isImageFile = (filePath: string) => IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());

const walkImages = async (dir: string): Promise<LocalImage[]> => {
  let entries: Array<import("fs").Dirent>;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const images: LocalImage[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      images.push(...await walkImages(absolutePath));
      continue;
    }
    if (!entry.isFile() || !isImageFile(absolutePath)) continue;

    images.push({
      absolutePath,
      fileName: entry.name,
      parentName: path.basename(path.dirname(absolutePath)),
    });
  }

  return images;
};

const normalizePublicUrl = (productId: number, fileName: string) =>
  `/images/products/${productId}/${encodeURIComponent(fileName).replace(/%2F/gi, "/")}`;

const sortImages = (images: LocalImage[]) =>
  [...images].sort((a, b) => a.absolutePath.localeCompare(b.absolutePath, undefined, { numeric: true }));

const getProductIdCandidateFromFileName = (fileName: string): number | null => {
  const fileStem = path.parse(fileName).name;
  const productPattern = /(?:^|[^a-z0-9])product[_ -]?(\d+)(?:\D|$)/i;
  const productMatch = productPattern.exec(fileStem);
  const numericMatch = productMatch || /(\d+)/.exec(fileStem);
  if (!numericMatch) return null;

  const candidate = Number(numericMatch[1]);
  return Number.isFinite(candidate) ? candidate : null;
};

const copyIntoTarget = async (image: LocalImage, targetDir: string, productId: number) => {
  const productDir = path.join(targetDir, String(productId));
  const targetPath = path.join(productDir, image.fileName);
  if (path.resolve(image.absolutePath) === path.resolve(targetPath)) return targetPath;

  await fs.mkdir(productDir, { recursive: true });
  await fs.copyFile(image.absolutePath, targetPath);
  return targetPath;
};

const main = async () => {
  const options = parseArgs();
  const sourceDir = path.resolve(options.sourceDir);
  const targetDir = path.resolve(options.targetDir);

  console.log(`Scanning local product images in ${sourceDir}`);
  console.log(`Target public image root: ${targetDir}`);
  console.log(options.apply ? "Apply mode: database writes enabled." : "Dry run: no database writes.");

  const images = await walkImages(sourceDir);
  if (!images.length) {
    console.log("No local product image files found.");
    return;
  }

  const products = await prisma.product.findMany({
    orderBy: { id: "asc" },
    include: { images: { orderBy: { position: "asc" } } },
  });

  let matchedProducts = 0;
  let updatedRows = 0;
  let createdRows = 0;
  let unchangedRows = 0;
  let deletedRows = 0;

  for (const product of products) {
    const matches = sortImages(images.filter((image) => {
      if (image.parentName === String(product.id) || image.parentName === String(product.scrapedId)) {
        return true;
      }

      const candidate = getProductIdCandidateFromFileName(image.fileName);
      return candidate === product.scrapedId;
    }));

    if (!matches.length) continue;

    matchedProducts += 1;
    console.log(`Product ${product.id} (scrapedId=${product.scrapedId}) matched ${matches.length} file(s).`);

    const staleImages = product.images
      .slice(matches.length)
      .filter((image) => image.imageUrl.startsWith("/images/products/"));
    for (const staleImage of staleImages) {
      if (options.apply) {
        await prisma.productImage.delete({ where: { id: staleImage.id } });
      }
      deletedRows += 1;
      console.log(`  delete stale image ${staleImage.id}: ${staleImage.imageUrl}`);
    }

    for (let index = 0; index < matches.length; index += 1) {
      const image = matches[index];
      const finalPath = options.copy
        ? await copyIntoTarget(image, targetDir, product.id)
        : image.absolutePath;

      const finalFileName = path.basename(finalPath);
      const imageUrl = normalizePublicUrl(product.id, finalFileName);
      const existing = product.images[index];

      if (!existing) {
        if (options.apply) {
          await prisma.productImage.create({
            data: {
              productId: product.id,
              imageUrl,
              position: index,
            },
          });
        }
        createdRows += 1;
        console.log(`  create position=${index} ${imageUrl}`);
        continue;
      }

      if (existing.imageUrl === imageUrl) {
        unchangedRows += 1;
        continue;
      }

      if (options.apply) {
        await prisma.productImage.update({
          where: { id: existing.id },
          data: { imageUrl },
        });
      }
      updatedRows += 1;
      console.log(`  update image ${existing.id}: ${existing.imageUrl} -> ${imageUrl}`);
    }
  }

  console.log(
    `Done. files=${images.length}, matchedProducts=${matchedProducts}, updated=${updatedRows}, created=${createdRows}, deleted=${deletedRows}, unchanged=${unchangedRows}`,
  );
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
