import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const PRODUCT_SKU = "158250";
const PRODUCT_NAME = "Nexis Spinner extensible (4 roues) 76cm";
const PRICE_TND = 1890;
const STOCK_PER_VARIANT = 4;

const images = {
  onyxBlack: [
    "https://www.samsonite.co.uk/dw/image/v2/AATF_PRD/on/demandware.static/-/Sites-samsonite-product-catalog/default/dw3001d8ae/images/salsify/gkmxyanohwcospsf6vpw_s--P-3EtG6M--_fl_clip_pg_1_e_trim_c_fit_w_2000_h_3000_u_tcrttuyt8xafi2acibgb_fl_layer_apply_e_make_transparent.png?sh=900&sw=600",
  ],
  green: [
    "https://www.samsonite.co.uk/dw/image/v2/AATF_PRD/on/demandware.static/-/Sites-samsonite-product-catalog/default/dw02c68241/images/salsify/ywe2qypgrhq7hmu3vmap_s--oC0xfetQ--_fl_clip_pg_1_e_trim_c_fit_w_2000_h_3000_u_tcrttuyt8xafi2acibgb_fl_layer_apply_e_make_transparent.png?sh=900&sw=600",
  ],
};

const productImages = [...images.onyxBlack, ...images.green];

const features = [
  { featureName: "Garantie", featureValue: "Garantie mondiale limitée de 10 ans" },
  { featureName: "Modèle", featureValue: "Valise à 4 roues" },
  { featureName: "Matière principale extérieure", featureValue: "ROXKIN™ (Polypropylène)" },
  { featureName: "Type de matière", featureValue: "Rigide" },
  { featureName: "Dimensions", featureValue: "76 x 52 x 29 cm" },
  { featureName: "Dimensions extensibles", featureValue: "76 x 52 x 32 cm" },
  { featureName: "Taille", featureValue: "Large" },
  { featureName: "Volume", featureValue: "105/116 L" },
  { featureName: "Poids", featureValue: "3.5 kg" },
  { featureName: "SKU", featureValue: "158250-0581 / 158250-A834" },
  { featureName: "Serrure", featureValue: "Serrure TSA" },
  { featureName: "Fermetures", featureValue: "Oui" },
  { featureName: "Poignées", featureValue: "Poignées supérieure et latérale" },
  { featureName: "Poignée de traction", featureValue: "Double tube" },
  { featureName: "Roulettes", featureValue: "4 roues" },
  { featureName: "Type de roues", featureValue: "Roues à suspension réduisant les chocs et le bruit" },
  { featureName: "Extensible", featureValue: "Oui" },
  { featureName: "Étiquette adresse", featureValue: "Étiquette d'identification intégrée" },
  { featureName: "Compartiment inférieur", featureValue: "Oui" },
  { featureName: "Compartiment supérieur", featureValue: "Oui" },
  { featureName: "Plateau séparateur", featureValue: "Dans les compartiments supérieur et inférieur" },
  { featureName: "Sangles", featureValue: "Oui" },
  { featureName: "Poche filet", featureValue: "Oui" },
  { featureName: "Cube de rangement", featureValue: "1 cube de rangement inclus, adapté à la taille de la valise" },
  { featureName: "Fabrication", featureValue: "Fabriqué en Europe" },
];

const ensureCategory = async () => {
  const parent = await prisma.category.upsert({
    where: { name: "Valises" },
    update: { slug: "valises", isActive: true },
    create: { name: "Valises", slug: "valises", isActive: true, showInMainMenu: true },
  });

  return prisma.category.upsert({
    where: { name: "Rigides" },
    update: { slug: "rigides", parentId: parent.id, isActive: true },
    create: {
      name: "Rigides",
      slug: "rigides",
      parentId: parent.id,
      isActive: true,
      showInMainMenu: false,
    },
  });
};

const buildVariant = ({
  colorName,
  colorHex,
  variantImages,
}: {
  colorName: string;
  colorHex: string;
  variantImages: string[];
}) => ({
  groupName: "Variante",
  value: `76 cm - ${colorName}`,
  colorName,
  colorHex,
  size: "76 cm",
  weight: "3.5 kg",
  width: "52",
  height: "76",
  depth: "29",
  isExpandable: true,
  expandedWidth: "52",
  expandedHeight: "76",
  expandedDepth: "32",
  volume: "105/116 L",
  price: PRICE_TND,
  stockInitial: STOCK_PER_VARIANT,
  stock: STOCK_PER_VARIANT,
  images: variantImages,
});

const main = async () => {
  const brand = await prisma.brand.upsert({
    where: { name: "Samsonite" },
    update: {},
    create: { name: "Samsonite" },
  });

  const category = await ensureCategory();
  const existing = await prisma.product.findFirst({
    where: {
      OR: [{ sku: PRODUCT_SKU }, { url: { contains: "nexis-spinner-expandable-76cm" } }],
    },
    select: { id: true, scrapedId: true },
  });

  const scrapedId = existing?.scrapedId ?? ((await prisma.product.aggregate({ _max: { scrapedId: true } }))._max.scrapedId ?? 0) + 1;
  const productData = {
    name: PRODUCT_NAME,
    sku: PRODUCT_SKU,
    description:
      "Nexis 76cm est une valise extensible haut de gamme en ROXKIN™, conçue pour les voyages longs avec un volume généreux, une organisation intérieure complète et des roues silencieuses.",
    price: PRICE_TND,
    currency: "TND",
    availability: "available",
    url: "https://www.samsonite.co.uk/nexis-spinner-expandable-76cm-onyx-black/158250-0581.html",
    weight: "3.5",
    width: "52",
    height: "76",
    depth: "29",
    quantity: STOCK_PER_VARIANT * 2,
    brandId: brand.id,
  };

  const product = existing
    ? await prisma.product.update({ where: { id: existing.id }, data: productData })
    : await prisma.product.create({ data: { scrapedId, ...productData } });

  await prisma.productCategory.deleteMany({ where: { productId: product.id } });
  await prisma.productCategory.create({ data: { productId: product.id, categoryId: category.id } });

  await prisma.productFeature.deleteMany({ where: { productId: product.id } });
  await prisma.productFeature.createMany({
    data: features.map((feature) => ({ productId: product.id, ...feature })),
  });

  await prisma.productImage.deleteMany({ where: { productId: product.id } });
  await prisma.productImage.createMany({
    data: productImages.map((imageUrl, position) => ({ productId: product.id, imageUrl, position })),
  });

  await prisma.productVariant.deleteMany({ where: { productId: product.id } });
  await prisma.productVariant.createMany({
    data: [
      buildVariant({ colorName: "Onyx Black", colorHex: "#111111", variantImages: images.onyxBlack }),
      buildVariant({ colorName: "Deep Forest", colorHex: "#193d33", variantImages: images.green }),
    ].map((variant) => ({ productId: product.id, ...variant })),
  });

  const updated = await prisma.product.findUnique({
    where: { id: product.id },
    include: { brand: true, categories: { include: { category: { include: { parent: true } } } }, variants: true },
  });

  console.log("Produit Nexis 76cm ajouté / mis à jour avec succès");
  console.log(
    JSON.stringify(
      {
        id: updated?.id,
        name: updated?.name,
        sku: updated?.sku,
        brand: updated?.brand?.name,
        category: updated?.categories[0]?.category.name,
        parentCategory: updated?.categories[0]?.category.parent?.name,
        quantity: updated?.quantity,
        variants: updated?.variants.map((variant) => ({
          color: variant.colorName,
          size: variant.size,
          stock: variant.stock,
          price: variant.price?.toString(),
        })),
      },
      null,
      2,
    ),
  );
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
