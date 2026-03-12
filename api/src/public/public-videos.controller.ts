import { Controller, Get, Param, Query } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller()
export class PublicVideosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("public/videos")
  async listVideos(
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "24",
    @Query("q") q?: string
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const sizeNum = Math.min(100, Math.max(1, Number(pageSize) || 24));
    const skip = (pageNum - 1) * sizeNum;

    const where = {
      moderationStatus: "APPROVED" as const,
      status: "READY" as const,
      ...(q?.trim()
        ? {
            OR: [
              { title: { contains: q.trim(), mode: "insensitive" as const } },
              {
                description: {
                  contains: q.trim(),
                  mode: "insensitive" as const,
                },
              },
              {
                event: {
                  title: {
                    contains: q.trim(),
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.video.findMany({
        where,
        skip,
        take: sizeNum,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        include: {
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      }),
      this.prisma.video.count({ where }),
    ]);

    return {
      items,
      page: pageNum,
      pageSize: sizeNum,
      total,
      totalPages: Math.ceil(total / sizeNum),
    };
  }

  @Get("public/events/:slug/videos")
  async listEventVideos(@Param("slug") slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
      },
    });

    if (!event) {
      return {
        ok: false,
        error: "Event not found",
        eventId: null,
        eventSlug: slug,
        eventTitle: null,
        videos: [],
      };
    }

    const videos = await this.prisma.video.findMany({
      where: {
        eventId: event.id,
        moderationStatus: "APPROVED",
        status: "READY",
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        eventId: true,
        title: true,
        description: true,
        sourceType: true,
        provider: true,
        playbackHlsUrl: true,
        playbackDashUrl: true,
        youtubeVideoId: true,
        durationSeconds: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ok: true,
      eventId: event.id,
      eventSlug: event.slug,
      eventTitle: event.title,
      videos,
    };
  }
}