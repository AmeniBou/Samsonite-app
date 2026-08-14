import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verify() {
  const total = await prisma.productVariant.count();
  const withStock4 = await prisma.productVariant.count({
    where: { stockInitial: 4 },
  });
  
  console.log(`Total ProductVariants: ${total}`);
  console.log(`ProductVariants with stockInitial = 4: ${withStock4}`);
  console.log(`Percentage: ${total > 0 ? ((withStock4 / total) * 100).toFixed(2) : 0}%`);
  
  await prisma.$disconnect();
}

verify().catch(console.error);
