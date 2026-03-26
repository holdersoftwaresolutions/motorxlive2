import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const dbUrl = process.env.DATABASE_URL || "";

try {
  const parsed = new URL(dbUrl);
  console.log("CHECK_DB_HOST:", parsed.hostname);
  console.log("CHECK_DB_NAME:", parsed.pathname);
} catch {
  console.log("CHECK_DB_URL_PARSE_FAILED");
}

async function main() {
  const emails = [
    "admin@motorxlive.com",
    "streamer@motorxlive.com",
    "media@motorxlive.com",
    "admin@motorxlive.local",
    "streamer@motorxlive.local",
    "media@motorxlive.local",
  ];

  for (const rawEmail of emails) {
    const email = rawEmail.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      console.log(`${email} => NOT_FOUND`);
      continue;
    }

    console.log(`${email} => FOUND`, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      hasPasswordHash: !!user.passwordHash,
      passwordHashLength: user.passwordHash?.length ?? 0,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  const totalUsers = await prisma.user.count();
  console.log("TOTAL_USERS:", totalUsers);
}

main()
  .catch((err) => {
    console.error("CHECK_USERS_FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });