import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("ChangeMe123!", 10);

  const user = await prisma.user.upsert({
    where: { email: "admin@motorxlive.local" },
    update: {
      passwordHash,
      role: "ADMIN",
      isActive: true,
      name: "Admin",
    },
    create: {
      email: "admin@motorxlive.local",
      passwordHash,
      role: "ADMIN",
      isActive: true,
      name: "Admin",
    },
  });

  console.log("Admin user ready:", user.email);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });