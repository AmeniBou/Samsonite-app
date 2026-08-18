import fs from "fs";
import path from "path";
import { prisma } from "../src/db/prisma.js";

type ExtractedVariant = {
  sourceVariantId: number;
  reference?: string;
  size?: string;
  colorName?: string;
  colorHex?: string;
  dimension?: string;
  height?: string | null;
  width?: string | null;
  depth?: string | null;
  volume?: string;
  weight?: string;
  price: number;
  stock: number;
  availability?: string;
  images: string[];
  productUrl?: string;
};

const productId = 45;
const variantsPath = "C:/samsonite_scraper/essens_variants.json";
const backupDir = path.resolve("backups");

const readVariants = (): ExtractedVariant[] => {
  const raw = fs.readFileSync(variantsPath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw) as ExtractedVariant[];
};

const main = async () => {
  const variants = readVariants();
  if (!variants.length) throw new Error(`Aucune variante trouvée dans ${variantsPath}`);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: { orderBy: { position: "asc" } },
      features: true,
      variants: true,
      categories: true,
    },
  });

  if (!product) throw new Error(`Produit ${productId} introuvable.`);

  fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `product-${productId}-before-essens-${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(product, null, 2), "utf8");

  const allImages = Array.from(new Set(variants.flatMap((variant) => variant.images))).filter(Boolean);
  const totalStock = variants.reduce((sum, variant) => sum + Math.max(0, Number(variant.stock || 0)), 0);
  const firstAvailable = variants.find((variant) => variant.stock > 0) || variants[0];
  const lowestPrice = Math.min(...variants.map((variant) => Number(variant.price)).filter(Number.isFinite));

  await prisma.$transaction(async (tx) => {
    await tx.productVariant.deleteMany({ where: { productId } });
    await tx.productImage.deleteMany({ where: { productId } });
    await tx.productFeature.deleteMany({ where: { productId } });

    await tx.product.update({
      where: { id: productId },
      data: {
        name: "ESSENS",
        sku: firstAvailable.reference || product.sku,
        description:
          "Voici Essens, votre nouvel indispensable pour chacun de vos déplacements. Profitez d'un voyage sans contrariété grâce à sa légèreté, à son système innovant de fermeture à 3 points et à sa solution de rangement innovante et unique. Produite au cœur de l'Europe et fabriquée à partir de matériaux recyclés, Essens est synonyme de durabilité sans aucun compromis sur la qualité.",
        price: lowestPrice,
        currency: "TND",
        availability: totalStock > 0 ? "in_stock" : "out_of_stock",
        url: "https://samsonite.com.tn/fr/rigides/218-essens.html",
        weight: firstAvailable.weight || product.weight,
        width: firstAvailable.width || product.width,
        height: firstAvailable.height || product.height,
        depth: firstAvailable.depth || product.depth,
        quantity: totalStock,
      },
    });

    if (allImages.length) {
      await tx.productImage.createMany({
        data: allImages.map((imageUrl, index) => ({
          productId,
          imageUrl,
          position: index,
        })),
      });
    }

    await tx.productFeature.createMany({
      data: [
        { productId, featureName: "Garantie", featureValue: "1 ans" },
        { productId, featureName: "Modèle", featureValue: "Valise 4 roues" },
        { productId, featureName: "Matière", featureValue: "100% Polypropylène" },
        { productId, featureName: "Catégorie", featureValue: "Rigide" },
        { productId, featureName: "Types des roues", featureValue: "Roulettes silencieuses & multidirectionnelles" },
      ],
    });

    await tx.productVariant.createMany({
      data: variants.map((variant) => ({
        productId,
        groupName: "Variante",
        value: [variant.colorName, variant.size].filter(Boolean).join(" / ") || `ESSENS ${variant.sourceVariantId}`,
        colorName: variant.colorName?.trim() || undefined,
        colorHex: variant.colorHex?.trim() || undefined,
        size: variant.size?.trim() || undefined,
        weight: variant.weight?.trim() || undefined,
        width: variant.width || undefined,
        height: variant.height || undefined,
        depth: variant.depth || undefined,
        isExpandable: false,
        expandedWidth: undefined,
        expandedHeight: undefined,
        expandedDepth: undefined,
        volume: variant.volume?.trim() || undefined,
        price: Number(variant.price),
        stockInitial: Math.max(0, Number(variant.stock || 0)),
        stock: Math.max(0, Number(variant.stock || 0)),
        images: variant.images || [],
      })),
    });
  });

  const updated = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true, images: true, features: true },
  });

  console.log(`Produit ${productId} mis à jour.`);
  console.log(`Backup: ${backupPath}`);
  console.log(`Variantes: ${updated?.variants.length ?? 0}`);
  console.log(`Stock total: ${updated?.quantity ?? 0}`);
  console.log(`Images produit: ${updated?.images.length ?? 0}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
