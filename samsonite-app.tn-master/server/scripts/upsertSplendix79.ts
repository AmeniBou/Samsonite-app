import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const PRODUCT_SKU = "149845";
const PRODUCT_NAME = "Splendix Spinner (4 roues) 79cm";
const PRICE_TND = 1590;
const STOCK_PER_VARIANT = 4;

const greenBlackImages = [
  "https://www.samsonite.co.uk/dw/image/v2/AATF_PRD/on/demandware.static/-/Sites-samsonite-product-catalog/default/dw24906685/images/salsify/eaovckobljzvnofha22q_s--sZ0At9og--_fl_clip_pg_1_e_trim_c_fit_w_2000_h_3000_u_tcrttuyt8xafi2acibgb_fl_layer_apply_e_make_transparent.png?sh=900&sw=600",
];

const blackImages = [
  "https://www.samsonite.co.uk/dw/image/v2/AATF_PRD/on/demandware.static/-/Sites-samsonite-product-catalog/default/dwbbc6f0b5/images/salsify/zbyerhyolvbvq7ttwurb_s--f3haZvAt--_fl_clip_pg_1_e_trim_c_fit_w_2000_h_3000_u_tcrttuyt8xafi2acibgb_fl_layer_apply_e_make_transparent.png?sh=900&sw=600",
  "https://www.samsonite.co.uk/dw/image/v2/AATF_PRD/on/demandware.static/-/Sites-samsonite-product-catalog/default/dwc6b11ede/images/salsify/iazjal1cyflxamxp44jm_s--OpxzXvzq--_fl_clip_pg_1_e_trim_c_fit_w_2000_h_3000_u_tcrttuyt8xafi2acibgb_fl_layer_apply_e_make_transparent.png?sh=900&sw=600",
];

const productImages = [...greenBlackImages, ...blackImages];

const features = [
  { featureName: "Garantie", featureValue: "Garantie mondiale limitée de 5 ans" },
  { featureName: "Modèle", featureValue: "Valise à 4 roues" },
  { featureName: "Matière principale extérieure", featureValue: "Nylon" },
  { featureName: "Type de matière", featureValue: "Souple" },
  { featureName: "Dimensions", featureValue: "79 x 48 x 30 cm" },
  { featureName: "Dimensions extensibles", featureValue: "79 x 48 x 34 cm" },
  { featureName: "Taille", featureValue: "Large" },
  { featureName: "Volume", featureValue: "109/120 L" },
  { featureName: "Poids", featureValue: "5 kg" },
  { featureName: "SKU", featureValue: "149845-1398 / 149845-1041" },
  { featureName: "Serrure", featureValue: "Serrure TSA" },
  { featureName: "Fermetures", featureValue: "Oui" },
  { featureName: "Poignées", featureValue: "Poignées supérieure et latérale" },
  { featureName: "Poignée de traction", featureValue: "Double tube" },
  { featureName: "Roulettes", featureValue: "4 roues" },
  { featureName: "Type de roues", featureValue: "Roues à suspension réduisant les chocs et le bruit" },
  { featureName: "Poche extérieure", featureValue: "1 poche avant" },
  { featureName: "Extensible", featureValue: "Oui" },
  { featureName: "Étiquette adresse", featureValue: "Étiquette d'identification intégrée" },
  { featureName: "Compartiment inférieur", featureValue: "Compartiment inférieur avec séparateur, sangles et poches" },
  { featureName: "Compartiment supérieur", featureValue: "Compartiment supérieur avec séparateur et poches" },
  { featureName: "Poche humide", featureValue: "Oui" },
  { featureName: "Sangles croisées", featureValue: "Oui" },
];

const ensureCategory = async () => {
  const parent = await prisma.category.upsert({
    where: { name: "Valises" },
    update: { slug: "valises", isActive: true },
    create: { name: "Valises", slug: "valises", isActive: true, showInMainMenu: true },
  });

  return prisma.category.upsert({
    where: { name: "Souples" },
    update: { slug: "souples", parentId: parent.id, isActive: true },
    create: {
      name: "Souples",
      slug: "souples",
      parentId: parent.id,
      isActive: true,
      showInMainMenu: false,
    },
  });
};

const main = async () => {
  const brand = await prisma.brand.upsert({
    where: { name: "Samsonite" },
    update: {},
    create: { name: "Samsonite" },
  });

  const category = await ensureCategory();

  const existing = await prisma.product.findFirst({
    where: {
      OR: [{ sku: PRODUCT_SKU }, { url: { contains: "splendix-spinner-df-expandable-79cm" } }],
    },
    select: { id: true, scrapedId: true },
  });

  const scrapedId = existing?.scrapedId ?? ((await prisma.product.aggregate({ _max: { scrapedId: true } }))._max.scrapedId ?? 0) + 1;

  const product = existing
    ? await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: PRODUCT_NAME,
          sku: PRODUCT_SKU,
          description:
            "Splendix redéfinit le voyage haut de gamme avec des finitions raffinées, des roulettes premium et un intérieur organisé avec de nombreuses poches.",
          price: PRICE_TND,
          currency: "TND",
          availability: "available",
          url: "https://www.samsonite.co.uk/splendix-spinner-df-expandable-79cm--green-black/149845-1398.html",
          weight: "5",
          width: "48",
          height: "79",
          depth: "30",
          quantity: STOCK_PER_VARIANT * 2,
          brandId: brand.id,
        },
      })
    : await prisma.product.create({
        data: {
          scrapedId,
          name: PRODUCT_NAME,
          sku: PRODUCT_SKU,
          description:
            "Splendix redéfinit le voyage haut de gamme avec des finitions raffinées, des roulettes premium et un intérieur organisé avec de nombreuses poches.",
          price: PRICE_TND,
          currency: "TND",
          availability: "available",
          url: "https://www.samsonite.co.uk/splendix-spinner-df-expandable-79cm--green-black/149845-1398.html",
          weight: "5",
          width: "48",
          height: "79",
          depth: "30",
          quantity: STOCK_PER_VARIANT * 2,
          brandId: brand.id,
        },
      });

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
      {
        productId: product.id,
        groupName: "Variante",
        value: "79 cm - Green/Black",
        colorName: "Green/Black",
        colorHex: "#2f3b2a",
        size: "79 cm",
        weight: "5 kg",
        width: "48",
        height: "79",
        depth: "30",
        isExpandable: true,
        expandedWidth: "48",
        expandedHeight: "79",
        expandedDepth: "34",
        volume: "109/120 L",
        price: PRICE_TND,
        stockInitial: STOCK_PER_VARIANT,
        stock: STOCK_PER_VARIANT,
        images: greenBlackImages,
      },
      {
        productId: product.id,
        groupName: "Variante",
        value: "79 cm - Black",
        colorName: "Black",
        colorHex: "#111111",
        size: "79 cm",
        weight: "5 kg",
        width: "48",
        height: "79",
        depth: "30",
        isExpandable: true,
        expandedWidth: "48",
        expandedHeight: "79",
        expandedDepth: "34",
        volume: "109/120 L",
        price: PRICE_TND,
        stockInitial: STOCK_PER_VARIANT,
        stock: STOCK_PER_VARIANT,
        images: blackImages,
      },
    ],
  });

  const updated = await prisma.product.findUnique({
    where: { id: product.id },
    include: { brand: true, categories: { include: { category: { include: { parent: true } } } }, variants: true },
  });

  console.log("Produit Splendix 79cm ajouté / mis à jour avec succès");
  console.log(
    JSON.stringify(
      {
        id: updated?.id,
        name: updated?.name,
        sku: updated?.sku,
        brand: updated?.brand?.name,
        category: updated?.categories[0]?.category.name,
        parentCategory: updated?.categories[0]?.category.parent?.name,
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
