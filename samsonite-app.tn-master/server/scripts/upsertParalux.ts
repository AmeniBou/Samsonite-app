import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const STOCK_PER_VARIANT = 4;

const paralux55 = {
  sku: "156523",
  name: "Paralux Spinner extensible (4 roues) 55cm",
  price: 1090,
  sourceUrl: "https://www.samsonite.co.uk/paralux-spinner-expandable-global-co-55cm-midnight-navy/156523-1552.html",
  width: "39",
  height: "55",
  depth: "23",
  expandedDepth: "26",
  weight: "2.9 kg",
  volume: "40/46 L",
  size: "55 cm",
  sizeLabel: "Cabine",
  averagePackingWeight: "Environ 10 kg",
  packingCubes: "2 cubes de rangement inclus (1 taille S et 1 taille M)",
  images: {
    midnightNavy: [
      "https://www.samsonite.co.uk/dw/image/v2/AATF_PRD/on/demandware.static/-/Sites-samsonite-product-catalog/default/dwbd0ed226/images/salsify/afbfkoskp159f9famhom_s--vFZgpqek--_fl_clip_pg_1_e_trim_c_fit_w_2000_h_3000_u_tcrttuyt8xafi2acibgb_fl_layer_apply_e_make_transparent.png?sh=900&sw=600",
      "https://www.samsonite.co.uk/dw/image/v2/AATF_PRD/on/demandware.static/-/Sites-samsonite-product-catalog/default/dwc326ec0e/images/salsify/xnvyud7pcecdnb2tcjb5_s--nydEEL0v--_fl_clip_pg_1_e_trim_c_fit_w_2000_h_3000_u_tcrttuyt8xafi2acibgb_fl_layer_apply_e_make_transparent.png?sh=900&sw=600",
    ],
    olive: [
      "https://www.samsonite.co.uk/dw/image/v2/AATF_PRD/on/demandware.static/-/Sites-samsonite-product-catalog/default/dw2d8990d6/images/salsify/ngk4ybprd2jevvxzuw67_s--RuyZpu-k--_fl_clip_pg_1_e_trim_c_fit_w_2000_h_3000_u_tcrttuyt8xafi2acibgb_fl_layer_apply_e_make_transparent.png?sh=900&sw=600",
    ],
  },
};

const paralux75 = {
  sku: "156526",
  name: "Paralux Spinner extensible (4 roues) 75cm",
  price: 1290,
  sourceUrl: "https://www.samsonite.co.uk/paralux-spinner-expandable-large-sp-75cm-midnight-navy/156526-1552.html",
  width: "50",
  height: "75",
  depth: "31",
  expandedDepth: "34",
  weight: "4.3 kg",
  volume: "105/115 L",
  size: "75 cm",
  sizeLabel: "Large",
  averagePackingWeight: "Environ 23 kg",
  packingCubes: "3 cubes de rangement inclus (tailles S, M et L)",
  images: {
    midnightNavy: [
      "https://www.samsonite.co.uk/dw/image/v2/AATF_PRD/on/demandware.static/-/Sites-samsonite-product-catalog/default/dwd42cd7ea/images/salsify/cxvfo6mnjvqadd0its1o_s--zXgagoWh--_fl_clip_pg_1_e_trim_c_fit_w_2000_h_3000_u_tcrttuyt8xafi2acibgb_fl_layer_apply_e_make_transparent.png?sh=900&sw=600",
      "https://www.samsonite.co.uk/dw/image/v2/AATF_PRD/on/demandware.static/-/Sites-samsonite-product-catalog/default/dw5ac2a38b/images/salsify/wmvxptwnqjqorjyveta2_s--IL2XgGMY--_fl_clip_pg_1_e_trim_c_fit_w_2000_h_3000_u_tcrttuyt8xafi2acibgb_fl_layer_apply_e_make_transparent.png?sh=900&sw=600",
    ],
    black: [
      "https://www.samsonite.co.uk/dw/image/v2/AATF_PRD/on/demandware.static/-/Sites-samsonite-product-catalog/default/dw25f64c59/images/salsify/zrhzby6jesrgp9hgdtjo_s--c2AZ-j92--_fl_clip_pg_1_e_trim_c_fit_w_2000_h_3000_u_tcrttuyt8xafi2acibgb_fl_layer_apply_e_make_transparent.png?sh=900&sw=600",
      "https://www.samsonite.co.uk/dw/image/v2/AATF_PRD/on/demandware.static/-/Sites-samsonite-product-catalog/default/dw46738aa1/images/salsify/zk0tlzdhfptuvffnasso_s--0Izfxfl---_fl_clip_pg_1_e_trim_c_fit_w_2000_h_3000_u_tcrttuyt8xafi2acibgb_fl_layer_apply_e_make_transparent.png?sh=900&sw=600",
    ],
    olive: [
      "https://www.samsonite.de/dw/image/v2/AATF_PRD/on/demandware.static/-/Sites-samsonite-product-catalog/default/dw618975fc/images/salsify/b5rbs3slgpj8pj2rythx_s--PwKQzS5k--_fl_clip_pg_1_e_trim_c_fit_w_2000_h_3000_u_tcrttuyt8xafi2acibgb_fl_layer_apply_e_make_transparent.png?sh=900&sw=600",
    ],
  },
};

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

const buildFeatures = (product: typeof paralux55 | typeof paralux75, variantSkus: string[]) => [
  { featureName: "Garantie", featureValue: "Garantie mondiale limitée de 5 ans" },
  { featureName: "Modèle", featureValue: "Valise à 4 roues" },
  { featureName: "Matière principale extérieure", featureValue: "Polypropylène" },
  { featureName: "Type de matière", featureValue: "Rigide" },
  { featureName: "Dimensions", featureValue: `${product.height} x ${product.width} x ${product.depth} cm` },
  { featureName: "Dimensions extensibles", featureValue: `${product.height} x ${product.width} x ${product.expandedDepth} cm` },
  { featureName: "Taille", featureValue: product.sizeLabel },
  { featureName: "Volume", featureValue: product.volume },
  { featureName: "Capacité moyenne", featureValue: product.averagePackingWeight },
  { featureName: "Poids", featureValue: product.weight },
  { featureName: "SKU", featureValue: variantSkus.join(" / ") },
  { featureName: "Serrure", featureValue: "Serrure TSA" },
  { featureName: "Fermetures", featureValue: "Oui" },
  { featureName: "Poignées", featureValue: "Poignées supérieure et latérale" },
  { featureName: "Poignée de traction", featureValue: "Double tube" },
  { featureName: "Roulettes", featureValue: "4 roues" },
  { featureName: "Type de roues", featureValue: "Roues à suspension réduisant les chocs et le bruit" },
  { featureName: "Poche extérieure", featureValue: "Poche avant à accès facile" },
  { featureName: "Extensible", featureValue: "Oui" },
  { featureName: "Compartiment ordinateur", featureValue: product.size === "55 cm" ? "Oui" : "Non" },
  { featureName: "Plateau séparateur", featureValue: "1 séparateur fixe et 1 séparateur flottant avec poche humide" },
  { featureName: "Sangles", featureValue: "Oui" },
  { featureName: "Poche humide", featureValue: "Oui" },
  { featureName: "Organisation intérieure", featureValue: "Oui" },
  { featureName: "Poche filet", featureValue: "Oui" },
  { featureName: "Cubes de rangement", featureValue: product.packingCubes },
  { featureName: "Support AirTag", featureValue: "Oui" },
];

const buildVariant = ({
  product,
  colorName,
  colorHex,
  variantImages,
}: {
  product: typeof paralux55 | typeof paralux75;
  colorName: string;
  colorHex: string;
  variantImages: string[];
}) => ({
  groupName: "Variante",
  value: `${product.size} - ${colorName}`,
  colorName,
  colorHex,
  size: product.size,
  weight: product.weight,
  width: product.width,
  height: product.height,
  depth: product.depth,
  isExpandable: true,
  expandedWidth: product.width,
  expandedHeight: product.height,
  expandedDepth: product.expandedDepth,
  volume: product.volume,
  price: product.price,
  stockInitial: STOCK_PER_VARIANT,
  stock: STOCK_PER_VARIANT,
  images: variantImages,
});

const upsertProduct = async ({
  productData,
  variants,
  variantSkus,
  brandId,
  categoryId,
}: {
  productData: typeof paralux55 | typeof paralux75;
  variants: Array<ReturnType<typeof buildVariant>>;
  variantSkus: string[];
  brandId: number;
  categoryId: number;
}) => {
  const existing = await prisma.product.findFirst({
    where: {
      OR: [{ sku: productData.sku }, { url: productData.sourceUrl }],
    },
    select: { id: true, scrapedId: true },
  });

  const scrapedId = existing?.scrapedId ?? ((await prisma.product.aggregate({ _max: { scrapedId: true } }))._max.scrapedId ?? 0) + 1;
  const allImages = variants.flatMap((variant) => variant.images);
  const base = {
    name: productData.name,
    sku: productData.sku,
    description:
      "Paralux est une valise rigide extensible pensée pour une organisation flexible, avec ouverture frontale pratique, cubes de rangement inclus et matériaux recyclés.",
    price: productData.price,
    currency: "TND",
    availability: "available",
    url: productData.sourceUrl,
    weight: productData.weight.replace(" kg", ""),
    width: productData.width,
    height: productData.height,
    depth: productData.depth,
    quantity: STOCK_PER_VARIANT * variants.length,
    brandId,
  };

  const product = existing
    ? await prisma.product.update({ where: { id: existing.id }, data: base })
    : await prisma.product.create({ data: { scrapedId, ...base } });

  await prisma.productCategory.deleteMany({ where: { productId: product.id } });
  await prisma.productCategory.create({ data: { productId: product.id, categoryId } });

  await prisma.productFeature.deleteMany({ where: { productId: product.id } });
  await prisma.productFeature.createMany({
    data: buildFeatures(productData, variantSkus).map((feature) => ({ productId: product.id, ...feature })),
  });

  await prisma.productImage.deleteMany({ where: { productId: product.id } });
  await prisma.productImage.createMany({
    data: allImages.map((imageUrl, position) => ({ productId: product.id, imageUrl, position })),
  });

  await prisma.productVariant.deleteMany({ where: { productId: product.id } });
  await prisma.productVariant.createMany({
    data: variants.map((variant) => ({ productId: product.id, ...variant })),
  });

  return prisma.product.findUnique({
    where: { id: product.id },
    include: { brand: true, categories: { include: { category: { include: { parent: true } } } }, variants: true },
  });
};

const main = async () => {
  const brand = await prisma.brand.upsert({
    where: { name: "Samsonite" },
    update: {},
    create: { name: "Samsonite" },
  });
  const category = await ensureCategory();

  const products = await Promise.all([
    upsertProduct({
      productData: paralux55,
      brandId: brand.id,
      categoryId: category.id,
      variantSkus: ["156523-1552", "156523-1633"],
      variants: [
        buildVariant({
          product: paralux55,
          colorName: "Midnight Navy",
          colorHex: "#172f45",
          variantImages: paralux55.images.midnightNavy,
        }),
        buildVariant({
          product: paralux55,
          colorName: "Olive",
          colorHex: "#687047",
          variantImages: paralux55.images.olive,
        }),
      ],
    }),
    upsertProduct({
      productData: paralux75,
      brandId: brand.id,
      categoryId: category.id,
      variantSkus: ["156526-1552", "156526-1041", "156526-1633"],
      variants: [
        buildVariant({
          product: paralux75,
          colorName: "Midnight Navy",
          colorHex: "#172f45",
          variantImages: paralux75.images.midnightNavy,
        }),
        buildVariant({
          product: paralux75,
          colorName: "Black",
          colorHex: "#111111",
          variantImages: paralux75.images.black,
        }),
        buildVariant({
          product: paralux75,
          colorName: "Olive",
          colorHex: "#687047",
          variantImages: paralux75.images.olive,
        }),
      ],
    }),
  ]);

  console.log("Produits Paralux ajoutés / mis à jour avec succès");
  console.log(
    JSON.stringify(
      products.map((product) => ({
        id: product?.id,
        name: product?.name,
        sku: product?.sku,
        brand: product?.brand?.name,
        category: product?.categories[0]?.category.name,
        parentCategory: product?.categories[0]?.category.parent?.name,
        quantity: product?.quantity,
        variants: product?.variants.map((variant) => ({
          color: variant.colorName,
          size: variant.size,
          stock: variant.stock,
          price: variant.price?.toString(),
        })),
      })),
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
