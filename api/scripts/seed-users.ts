import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const dbUrl = process.env.DATABASE_URL || "";

try {
  const parsed = new URL(dbUrl);
  console.log("SEED_DB_HOST:", parsed.hostname);
  console.log("SEED_DB_NAME:", parsed.pathname);
} catch {
  console.log("SEED_DB_URL_PARSE_FAILED");
}

const prisma = new PrismaClient();

type Role = "ADMIN" | "STREAMER" | "MEDIA";

async function upsertUser(
  email: string,
  password: string,
  role: Role,
  name: string
) {
  const normalizedEmail = email.toLowerCase().trim();
  const passwordHash = await hash(password, 10);

  return prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      passwordHash,
      role,
      isActive: true,
      name,
    },
    create: {
      email: normalizedEmail,
      passwordHash,
      role,
      isActive: true,
      name,
    },
  });
}

async function main() {
  const users = [
    {
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
      role: "ADMIN" as Role,
      name: process.env.SEED_ADMIN_NAME || "Admin User",
    },
    {
      email: process.env.SEED_STREAMER_EMAIL,
      password: process.env.SEED_STREAMER_PASSWORD,
      role: "STREAMER" as Role,
      name: process.env.SEED_STREAMER_NAME || "Streamer User",
    },
    {
      email: process.env.SEED_MEDIA_EMAIL,
      password: process.env.SEED_MEDIA_PASSWORD,
      role: "MEDIA" as Role,
      name: process.env.SEED_MEDIA_NAME || "Media User",
    },
  ];

  for (const user of users) {
    if (!user.email || !user.password) {
      console.warn(`Skipping ${user.role} (missing env vars)`);
      continue;
    }

    await upsertUser(user.email, user.password, user.role, user.name);

    console.log(`${user.role} ready: ${user.email}`);
  }

  console.log("All users processed");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });