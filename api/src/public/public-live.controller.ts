import { Controller, Get, Query } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller()
export class PublicLiveController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("public/live")
  async listLive(
    @Query("category") categorySlug?: string,
    @Query("page") pageStr?: string,
    @Query("pageSize") pageSizeStr?: string
  ) {
    const page = Math.max(1, Number(pageStr || 1));
    const pageSize = Math.max(1, Math.min(100, Number(pageSizeStr || 24)));
    const skip = (page - 1) * pageSize;

    const where: any = {
      category: categorySlug ? { slug: categorySlug } : undefined,
      streams: {
        some: {
          needsReview: false,
          lifecycle: {
            in: ["READY", "LIVE"],
          },
          OR: [
            { youtubeVideoId: { not: null } },
            { playbackHlsUrl: { not: null } },
            { playbackDashUrl: { not: null } },
          ],
        },
      },
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
          streams: {
            where: {
              needsReview: false,
              lifecycle: {
                in: ["READY", "LIVE"],
              },
            },
            orderBy: [{ isPrimary: "desc" }, { priority: "asc" }],
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
}