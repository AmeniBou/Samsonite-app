import { prisma } from '../src/db/prisma.js';
(async () => {
  // use imported prisma
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
