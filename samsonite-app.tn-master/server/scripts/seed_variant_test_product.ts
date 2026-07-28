import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const TEST_SCRAPED_ID = 990001;

const main = async () => {
  const brand = await prisma.brand.upsert({
    where: { name: "Samsonite" },
    update: {},
    create: { name: "Samsonite" },
  });

  const parentCategory = await prisma.category.upsert({
    where: { name: "Valises" },
    update: { slug: "valises" },
    create: { name: "Valises", slug: "valises" },
  });

  const childCategory = await prisma.category.upsert({
    where: { name: "Valises de test variantes" },
    update: { slug: "valises-test-variantes", parentId: parentCategory.id },
    create: {
      name: "Valises de test variantes",
      slug: "valises-test-variantes",
      parentId: parentCategory.id,
    },
  });

  const existing = await prisma.product.findUnique({
    where: { scrapedId: TEST_SCRAPED_ID },
    select: { id: true },
  });

  if (existing) {
    await prisma.product.delete({ where: { id: existing.id } });
  }

  const product = await prisma.product.create({
    data: {
      scrapedId: TEST_SCRAPED_ID,
      name: "Variant Lab Spinner",
      sku: "VAR-LAB-SPINNER",
      description:
        "Produit de test pour valider les variantes taille + couleur. Certaines combinaisons existent, certaines sont indisponibles, et une combinaison est volontairement absente.",
      price: 749.0,
      currency: "TND",
      availability: "available",
      url: "https://samsonite.test/variant-lab-spinner",
      weight: "2.8",
      width: "40",
      height: "55",
      depth: "23",
      quantity: 27,
      brandId: brand.id,
      categories: {
        create: [{ categoryId: childCategory.id }],
      },
      images: {
        create: [
          {
            imageUrl:
              "/assets/home-category-valises.png",
            position: 0,
          },
          {
            imageUrl:
              "/assets/home-category-business.png",
            position: 1,
          },
        ],
      },
      features: {
        create: [
          { featureName: "Matière", featureValue: "Polycarbonate" },
          { featureName: "Roulettes", featureValue: "4 roues doubles silencieuses" },
          { featureName: "Garantie", featureValue: "Garantie mondiale limitée 5 ans" },
        ],
      },
      variants: {
        create: [
          {
            groupName: "Variante",
            value: "55 cm - Alpine Green",
            colorName: "Alpine Green",
            colorHex: "#0F6B4F",
            size: "55 cm",
            height: "55",
            width: "40",
            depth: "23",
            volume: "39 L",
            weight: "2.8 kg",
            price: 749.0,
            stockInitial: 8,
            stock: 8,
            images: ["/assets/home-category-valises.png", "/assets/home-category-business.png"],
          },
          {
            groupName: "Variante",
            value: "69 cm - Alpine Green",
            colorName: "Alpine Green",
            colorHex: "#0F6B4F",
            size: "69 cm",
            height: "69",
            width: "46",
            depth: "28",
            volume: "73 L",
            weight: "3.6 kg",
            price: 899.0,
            stockInitial: 5,
            stock: 2,
            images: ["/assets/home-category-valises.png"],
          },
          {
            groupName: "Variante",
            value: "75 cm - Alpine Green",
            colorName: "Alpine Green",
            colorHex: "#0F6B4F",
            size: "75 cm",
            height: "75",
            width: "51",
            depth: "31",
            volume: "98 L",
            weight: "4.2 kg",
            price: 999.0,
            stockInitial: 3,
            stock: 0,
            images: ["/assets/home-category-valises.png"],
          },
          {
            groupName: "Variante",
            value: "55 cm - Midnight Blue",
            colorName: "Midnight Blue",
            colorHex: "#1B3556",
            size: "55 cm",
            height: "55",
            width: "40",
            depth: "23",
            volume: "39 L",
            weight: "2.8 kg",
            price: 759.0,
            stockInitial: 7,
            stock: 7,
            images: ["/assets/home-category-business.png"],
          },
          {
            groupName: "Variante",
            value: "69 cm - Midnight Blue",
            colorName: "Midnight Blue",
            colorHex: "#1B3556",
            size: "69 cm",
            height: "69",
            width: "46",
            depth: "28",
            volume: "73 L",
            weight: "3.6 kg",
            price: 909.0,
            stockInitial: 4,
            stock: 4,
            images: ["/assets/home-category-business.png"],
          },
          {
            groupName: "Variante",
            value: "55 cm - Golden Yellow",
            colorName: "Golden Yellow",
            colorHex: "#D9A21B",
            size: "55 cm",
            height: "55",
            width: "40",
            depth: "23",
            volume: "39 L",
            weight: "2.8 kg",
            price: 729.0,
            stockInitial: 6,
            stock: 6,
            images: ["/assets/home-category-disney.png"],
          },
          {
            groupName: "Variante",
            value: "75 cm - Golden Yellow",
            colorName: "Golden Yellow",
            colorHex: "#D9A21B",
            size: "75 cm",
            height: "75",
            width: "51",
            depth: "31",
            volume: "98 L",
            weight: "4.2 kg",
            price: 979.0,
            stockInitial: 2,
            stock: 1,
            images: ["/assets/home-category-disney.png"],
          },
        ],
      },
    },
    include: { variants: true },
  });

  console.log("Produit de test inséré");
  console.log({
    id: product.id,
    scrapedId: product.scrapedId,
    name: product.name,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      size: variant.size,
      color: variant.colorName,
      stock: variant.stock,
      price: variant.price?.toString(),
    })),
  });
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
