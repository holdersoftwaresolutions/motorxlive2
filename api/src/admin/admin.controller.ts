import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateCategoryDto,
  CreateEventDto,
  UpdateCategoryDto,
  UpdateEventDto,
} from "./admin.dto";

@Controller("admin")
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  // -----------------------------
  // Categories
  // -----------------------------

  @Get("categories")
  async listCategories() {
    return this.prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  @Post("categories")
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  @Patch("categories/:id")
  async updateCategory(
    @Param("id") id: string,
    @Body() dto: UpdateCategoryDto
  ) {
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  // -----------------------------
  // Events
  // -----------------------------

  @Get("events")
  async listEvents() {
    return this.prisma.event.findMany({
      orderBy: [{ startAt: "asc" }, { title: "asc" }],
      include: {
        category: true,
      },
    });
  }

  @Get("events/:id")
  async getEvent(@Param("id") id: string) {
    return this.prisma.event.findUnique({
      where: { id },
      include: {
        category: true,
        videos: true,
      },
    });
  }

  @Post("events")
  async createEvent(@Body() dto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        heroImageUrl: dto.heroImageUrl,
        categoryId: dto.categoryId,
      },
      include: {
        category: true,
      },
    });
  }

  @Patch("events/:id")
  async updateEvent(@Param("id") id: string, @Body() dto: UpdateEventDto) {
    return this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.startAt !== undefined ? { startAt: dto.startAt ? new Date(dto.startAt) : null } : {}),
        ...(dto.endAt !== undefined ? { endAt: dto.endAt ? new Date(dto.endAt) : null } : {}),
        ...(dto.heroImageUrl !== undefined ? { heroImageUrl: dto.heroImageUrl } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
      },
      include: {
        category: true,
      },
    });
  }
}
