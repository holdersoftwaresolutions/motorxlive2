import { Controller, Get, Query } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { VideoStatus } from "@prisma/client";

@Controller()
export class PublicVideosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("public/videos")
  async listVideos(
    @Query("category") categorySlug?: string,
    @Query("q") q?: string,
    @Query("page") pageStr?: string,
    @Query("pageSize") pageSizeStr?: string,
    @Query("sort") sort?: "newest" | "oldest"
  ) {
    const page = Math.max(1, Number(pageStr || 1));
    const pageSize = Math.max(1, Math.min(100, Number(pageSizeStr || 24)));
    const skip = (page - 1) * pageSize;
    const orderBy = sort === "oldest" ? [{ publishedAt: "asc" as const }] : [{ publishedAt: "desc" as const }];

    const where: any = {
      status: VideoStatus.READY,
      publishedAt: { not: null },
      needsReview: false,
      event: { category: categorySlug ? { slug: categorySlug } : undefined },
      OR: q
        ? [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { event: { title: { contains: q, mode: "insensitive" } } },
          ]
        : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.video.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: { event: { include: { category: true } } },
      }),
      this.prisma.video.count({ where }),
    ]);

    return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }
}
