import "dotenv/config";

import { prisma } from "../src/db/prisma";

async function main() {

   console.log(process.env.DATABASE_URL);

   const brands = await prisma.brand.findMany();

   console.log(brands);

}

main()
.catch(console.error)
.finally(async()=>{

   await prisma.$disconnect();

});