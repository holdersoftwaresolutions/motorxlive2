import { Controller, Get, Query } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller()
export class PublicEventsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("public/events")
  async listEvents(
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "12",
    @Query("q") q?: string,
    @Query("lat") lat?: string,
    @Query("lng") lng?: string,
    @Query("radiusMiles") radiusMiles?: string,
    @Query("from") from?: string,
    @Query("categorySlug") categorySlug?: string,
    @Query("category") category?: string
  ) {
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const take = Math.min(Math.max(parseInt(pageSize, 10) || 12, 1), 50);
    const skip = (pageNumber - 1) * take;

    const where: any = {
      eventReviewStatus: {
        notIn: ["NEEDS_REVIEW", "ARCHIVED", "MERGED"],
      },
    };

    const requestedCategorySlug = (categorySlug || category || "").trim();

    if (requestedCategorySlug) {
      const matchedCategory = await this.prisma.category.findUnique({
        where: {
          slug: requestedCategorySlug,
        },
        select: {
          id: true,
        },
      });

      if (!matchedCategory) {
        return {
          items: [],
          page: pageNumber,
          pageSize: take,
        };
      }

      where.categoryId = matchedCategory.id;
    }

    if (from) {
      const fromDate = new Date(from);

      where.OR = [
        {
          startAt: {
            gte: fromDate,
          },
        },
        {
          endAt: {
            gte: fromDate,
          },
        },
      ];
    }

    if (q?.trim()) {
      where.OR = [
        { title: { contains: q.trim(), mode: "insensitive" } },
        { venueName: { contains: q.trim(), mode: "insensitive" } },
        { city: { contains: q.trim(), mode: "insensitive" } },
        { state: { contains: q.trim(), mode: "insensitive" } },
      ];
    }

    const events = await this.prisma.event.findMany({
      where,
      skip,
      take,
      orderBy: [{ startAt: "asc" }],
      include: {
        category: true,
        streams: {
          where: {
            moderationStatus: "APPROVED",
            lifecycle: {
              in: ["READY", "LIVE"],
            },
            OR: [
              { youtubeVideoId: { not: null } },
              { playbackHlsUrl: { not: null } },
              { playbackDashUrl: { not: null } },
            ],
          },
          orderBy: [
            { isPrimary: "desc" },
            { priority: "asc" },
            { updatedAt: "desc" },
          ],
          select: {
            id: true,
            title: true,
            sourceType: true,
            provider: true,
            isPrimary: true,
            priority: true,
            playbackHlsUrl: true,
            playbackDashUrl: true,
            youtubeVideoId: true,
            lifecycle: true,
            moderationStatus: true,
            updatedAt: true,
          },
        },
      },
    });

    return {
      items: events,
      page: pageNumber,
      pageSize: take,
    };
  }
}