import { PrismaClient } from '../server/node_modules/.pnpm/@prisma+client@4.17.0/node_modules/@prisma/client/index.js';

(async () => {
  const prisma = new PrismaClient();
  try {
    const prods = await prisma.product.findMany({ take: 200, orderBy: { id: 'asc' }, include: { images: true } });
    for (const p of prods) {
      console.log(p.id, 'images=', (p.images || []).length, 'urls=', JSON.stringify((p.images || []).map(i => i.imageUrl).slice(0, 3)));
    }
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
