import { PrismaClient } from "@prisma/client";

async function verify() {
  const prisma = new PrismaClient();
  try {
    const total = await prisma.productVariant.count();
    const withStock4 = await prisma.productVariant.count({
      where: { stockInitial: 4 },
    });
    
    console.log(`Total ProductVariants: ${total}`);
    console.log(`ProductVariants with stockInitial = 4: ${withStock4}`);
    if (total > 0) {
      console.log(`Coverage: ${((withStock4 / total) * 100).toFixed(2)}%`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

verify().catch(console.error);
