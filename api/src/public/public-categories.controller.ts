import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller()
export class PublicCategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("public/categories")
  async listCategories() {
    return this.prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        sortOrder: true,
      },
    });
  }
}