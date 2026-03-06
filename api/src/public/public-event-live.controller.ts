import { Controller, Get, Param } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller()
export class PublicEventLiveController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("public/events/:slug/live")
  async getEventLiveBySlug(@Param("slug") slug: string) {
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
        streams: {
          where: {
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
          orderBy: [{ isPrimary: "desc" }, { priority: "asc" }],
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

    return {
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      startAt: event.startAt,
      endAt: event.endAt,
      flyerUrl: event.heroImageUrl,
      category: event.category,
      streams: event.streams,
      videos: event.videos,
    };
  }
}