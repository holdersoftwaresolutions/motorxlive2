import { Controller, Get, Param, Query } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller()
export class PublicEventsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("public/events")
  async listEvents(
    @Query("category") categorySlug?: string,
    @Query("page") pageStr?: string,
    @Query("pageSize") pageSizeStr?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    const page = Math.max(1, Number(pageStr || 1));
    const pageSize = Math.max(1, Math.min(100, Number(pageSizeStr || 24)));
    const skip = (page - 1) * pageSize;

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    const where: any = {
      category: categorySlug ? { slug: categorySlug } : undefined,
      startAt:
        fromDate || toDate
          ? {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            }
          : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        orderBy: [
          { category: { sortOrder: "asc" } },
          { startAt: "asc" },
          { title: "asc" },
        ],
        skip,
        take: pageSize,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              sortOrder: true,
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  @Get("public/events/:slug")
  async getEventBySlug(@Param("slug") slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            sortOrder: true,
          },
        },
        videos: {
          where: {
            status: "READY",
            needsReview: false,
            publishedAt: { not: null },
          },
          orderBy: [{ publishedAt: "desc" }],
        },
      },
    });

    if (!event) {
      return { ok: false, error: "Event not found" };
    }

    return event;
  }
}