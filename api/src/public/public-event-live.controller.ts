import { Controller, Get, Param } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller()
export class PublicEventLiveController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("public/events/:slug/live")
  async getEventLive(@Param("slug") slug: string) {
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
        primaryStream: null,
        streams: [],
      };
    }

    const streams = await this.prisma.stream.findMany({
      where: {
        eventId: event.id,
        needsReview: false,
        lifecycle: {
          in: ["READY", "LIVE"],
        },
      },
      orderBy: [
        { isPrimary: "desc" },
        { priority: "asc" },
        { createdAt: "asc" },
      ],
      select: {
        id: true,
        eventId: true,
        title: true,
        sourceType: true,
        provider: true,
        isPrimary: true,
        priority: true,
        playbackHlsUrl: true,
        playbackDashUrl: true,
        youtubeVideoId: true,
        lifecycle: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ok: true,
      eventId: event.id,
      eventSlug: event.slug,
      eventTitle: event.title,
      primaryStream: streams[0] || null,
      streams,
    };
  }
}