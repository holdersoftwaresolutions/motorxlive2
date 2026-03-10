import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(email: string, password: string, role: "ADMIN" | "STREAMER" | "MEDIA", name: string) {
  const passwordHash = await hash(password, 10);

  return prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role,
      isActive: true,
      name,
    },
    create: {
      email,
      passwordHash,
      role,
      isActive: true,
      name,
    },
  });
}

async function main() {
  await upsertUser("admin@motorxlive.local", "ChangeMe123!", "ADMIN", "Admin User");
  await upsertUser("streamer@motorxlive.local", "ChangeMe123!", "STREAMER", "Streamer User");
  await upsertUser("media@motorxlive.local", "ChangeMe123!", "MEDIA", "Media User");

  console.log("Seed users ready:");
  console.log("admin@motorxlive.local / ChangeMe123!");
  console.log("streamer@motorxlive.local / ChangeMe123!");
  console.log("media@motorxlive.local / ChangeMe123!");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });