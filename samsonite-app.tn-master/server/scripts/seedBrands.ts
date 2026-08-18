import { prisma } from "../src/db/prisma.js";

const brands = ["Samsonite", "American Tourister", "Lipault", "Disney"];

async function main() {
  for (const name of brands) {
    await prisma.brand.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const savedBrands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  console.log("Marques disponibles:");
  for (const brand of savedBrands) {
    console.log(`- ${brand.name} (${brand._count.products} produit(s))`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
