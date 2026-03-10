import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("ChangeMe123!", 10);

  const user = await prisma.user.upsert({
    where: { email: "streamer@motorxlive.local" },
    update: {
      passwordHash,
      role: "STREAMER",
      isActive: true,
      name: "Streamer",
    },
    create: {
      email: "streamer@motorxlive.local",
      passwordHash,
      role: "STREAMER",
      isActive: true,
      name: "Streamer",
    },
  });

  console.log("Streamer user ready:", user.email);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });