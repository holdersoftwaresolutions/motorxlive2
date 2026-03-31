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
        startAt: true,
        endAt: true,
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
        moderationStatus: "APPROVED",
        lifecycle: {
          in: ["READY", "LIVE"],
        },
        OR: [
          {
            youtubeVideoId: {
              not: null,
            },
          },
          {
            playbackHlsUrl: {
              not: null,
            },
          },
          {
            playbackDashUrl: {
              not: null,
            },
          },
        ],
      },
      orderBy: [
        { isPrimary: "desc" },
        { priority: "asc" },
        { updatedAt: "desc" },
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
        moderationStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const normalizedStreams = streams.map((stream) => ({
      ...stream,
      title: stream.title || "Live Feed",
      lifecycle: stream.lifecycle || "READY",
    }));

    const primaryStream =
      normalizedStreams.find((stream) => stream.isPrimary) ||
      normalizedStreams[0] ||
      null;

    return {
      ok: true,
      eventId: event.id,
      eventSlug: event.slug,
      eventTitle: event.title,
      eventStartAt: event.startAt,
      eventEndAt: event.endAt,
      primaryStream,
      streams: normalizedStreams,
    };
  }
}