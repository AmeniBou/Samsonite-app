import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const PRODUCT_SKU = "158240";
const PRODUCT_NAME = "Nexis Spinner extensible (4 roues) 55cm";
const PRICE_TND = 1490;
const STOCK_PER_VARIANT = 4;

const images = {
  vert: [
    "https://www.samsonite.co.uk/dw/image/v2/AATF_PRD/on/demandware.static/-/Sites-samsonite-product-catalog/default/dw328a126b/images/salsify/ywrg5ew5zttfopqil034_s--Ywhub9kW--_fl_clip_pg_1_e_trim_c_fit_w_2000_h_3000_u_tcrttuyt8xafi2acibgb_fl_layer_apply_e_make_transparent.png?sh=900&sw=600",
  ],
  onyxBlack: [
    "https://www.samsonite.co.uk/dw/image/v2/AATF_PRD/on/demandware.static/-/Sites-samsonite-product-catalog/default/dw80cb9e39/images/salsify/vrxcbflnbpnoae5cofq1_s--WmKQDcTA--_fl_clip_pg_1_e_trim_c_fit_w_2000_h_3000_u_tcrttuyt8xafi2acibgb_fl_layer_apply_e_make_transparent.png?sh=900&sw=600",
  ],
  cottonWhite: [
    "https://www.samsonite.co.uk/dw/image/v2/AATF_PRD/on/demandware.static/-/Sites-samsonite-product-catalog/default/dwb5a3e063/images/salsify/khxhggnzygsa2zbbnsqa_s--0w6fMvrK--_fl_clip_pg_1_e_trim_c_fit_w_2000_h_3000_u_tcrttuyt8xafi2acibgb_fl_layer_apply_e_make_transparent.png?sh=900&sw=600",
  ],
  deepPetrol: [
    "https://www.samsonite.co.uk/dw/image/v2/AATF_PRD/on/demandware.static/-/Sites-samsonite-product-catalog/default/dw858a9a3a/images/salsify/a8swojyezjiliszg2jfj_s--lLX04t4l--_fl_clip_pg_1_e_trim_c_fit_w_2000_h_3000_u_tcrttuyt8xafi2acibgb_fl_layer_apply_e_make_transparent.png?sh=900&sw=600",
  ],
  deepForest: [
    "https://www.samsonite.co.uk/dw/image/v2/AATF_PRD/on/demandware.static/-/Sites-samsonite-product-catalog/default/dw328a126b/images/salsify/ywrg5ew5zttfopqil034_s--Ywhub9kW--_fl_clip_pg_1_e_trim_c_fit_w_2000_h_3000_u_tcrttuyt8xafi2acibgb_fl_layer_apply_e_make_transparent.png?sh=900&sw=600",
  ],
};

const productImages = [
  ...images.vert,
  ...images.onyxBlack,
  ...images.cottonWhite,
  ...images.deepPetrol,
  ...images.deepForest,
];

const features = [
  { featureName: "Garantie", featureValue: "Garantie mondiale limitée de 10 ans" },
  { featureName: "Modèle", featureValue: "Valise à 4 roues" },
  { featureName: "Matière principale extérieure", featureValue: "ROXKIN™ (Polypropylène)" },
  { featureName: "Type de matière", featureValue: "Rigide" },
  { featureName: "Dimensions", featureValue: "55 x 40 x 20 cm" },
  { featureName: "Dimensions extensibles", featureValue: "55 x 40 x 23 cm" },
  { featureName: "Taille", featureValue: "Cabine" },
  { featureName: "Volume", featureValue: "40/47 L" },
  { featureName: "Poids", featureValue: "2.5 kg" },
  { featureName: "SKU", featureValue: "158240-0581 / 158240-A831 / 158240-A833 / 158240-A834" },
  { featureName: "Serrure", featureValue: "Serrure TSA" },
  { featureName: "Fermetures", featureValue: "Oui" },
  { featureName: "Poignées", featureValue: "Poignées supérieure et latérale" },
  { featureName: "Poignée de traction", featureValue: "Double tube" },
  { featureName: "Roulettes", featureValue: "4 roues" },
  { featureName: "Type de roues", featureValue: "Roues à suspension réduisant les chocs et le bruit" },
  { featureName: "Extensible", featureValue: "Oui" },
  { featureName: "Bagage cabine", featureValue: "Oui" },
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
  sku,
  variantImages,
}: {
  colorName: string;
  colorHex: string;
  sku: string;
  variantImages: string[];
}) => ({
  groupName: "Variante",
  value: `55 cm - ${colorName}`,
  colorName,
  colorHex,
  size: "55 cm",
  weight: "2.5 kg",
  width: "40",
  height: "55",
  depth: "20",
  isExpandable: true,
  expandedWidth: "40",
  expandedHeight: "55",
  expandedDepth: "23",
  volume: "40/47 L",
  price: PRICE_TND,
  stockInitial: STOCK_PER_VARIANT,
  stock: STOCK_PER_VARIANT,
  images: variantImages,
  sku,
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
      OR: [{ sku: PRODUCT_SKU }, { url: { contains: "nexis-spinner-expandable-length-40cm-55cm" } }],
    },
    select: { id: true, scrapedId: true },
  });

  const scrapedId = existing?.scrapedId ?? ((await prisma.product.aggregate({ _max: { scrapedId: true } }))._max.scrapedId ?? 0) + 1;
  const productData = {
    name: PRODUCT_NAME,
    sku: PRODUCT_SKU,
    description:
      "Nexis est une valise cabine extensible haut de gamme en ROXKIN™, conçue pour offrir résistance, légèreté, organisation intérieure et mobilité fluide.",
    price: PRICE_TND,
    currency: "TND",
    availability: "available",
    url: "https://www.samsonite.co.uk/nexis-spinner-expandable-length-40cm-55cm-onyx-black/158240-0581.html",
    weight: "2.5",
    width: "40",
    height: "55",
    depth: "20",
    quantity: STOCK_PER_VARIANT * 5,
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
      buildVariant({ colorName: "Vert", colorHex: "#24443a", sku: "158240-A834", variantImages: images.vert }),
      buildVariant({ colorName: "Onyx Black", colorHex: "#111111", sku: "158240-0581", variantImages: images.onyxBlack }),
      buildVariant({ colorName: "Cotton White", colorHex: "#f4f1ea", sku: "158240-A831", variantImages: images.cottonWhite }),
      buildVariant({ colorName: "Deep Petrol", colorHex: "#00566a", sku: "158240-A833", variantImages: images.deepPetrol }),
      buildVariant({ colorName: "Deep Forest", colorHex: "#193d33", sku: "158240-A834", variantImages: images.deepForest }),
    ].map((variant) => ({
      productId: product.id,
      groupName: variant.groupName,
      value: variant.value,
      colorName: variant.colorName,
      colorHex: variant.colorHex,
      size: variant.size,
      weight: variant.weight,
      width: variant.width,
      height: variant.height,
      depth: variant.depth,
      isExpandable: variant.isExpandable,
      expandedWidth: variant.expandedWidth,
      expandedHeight: variant.expandedHeight,
      expandedDepth: variant.expandedDepth,
      volume: variant.volume,
      price: variant.price,
      stockInitial: variant.stockInitial,
      stock: variant.stock,
      images: variant.images,
    })),
  });

  const updated = await prisma.product.findUnique({
    where: { id: product.id },
    include: { brand: true, categories: { include: { category: { include: { parent: true } } } }, variants: true },
  });

  console.log("Produit Nexis 55cm ajouté / mis à jour avec succès");
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
