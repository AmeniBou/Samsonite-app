import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/db/prisma";

async function main() {
  const username =  "admin";
  const password = "admin";

  const existing = await prisma.adminUser.findUnique({ where: { username } });
  if (existing) {
    console.log(`Admin user '${username}' already exists (id=${existing.id}).`);
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const created = await prisma.adminUser.create({
    data: {
      username,
      passwordHash: hash,
    },
  });

  console.log(`Created admin user '${username}' (id=${created.id}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
