import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("ChangeMe123!", 10);

  const user = await prisma.user.upsert({
    where: { email: "media@motorxlive.local" },
    update: {
      passwordHash,
      role: "MEDIA",
      isActive: true,
      name: "Media",
    },
    create: {
      email: "media@motorxlive.local",
      passwordHash,
      role: "MEDIA",
      isActive: true,
      name: "Media",
    },
  });

  console.log("Media user ready:", user.email);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });