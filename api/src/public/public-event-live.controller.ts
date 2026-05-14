import { Controller, Get, Param } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller()
export class PublicEventLiveController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("public/events/:slug/live")
  async getEventLive(@Param("slug") slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: {
        category: true,
      },
    });

    if (!event) {
      return {
        ok: false,
        error: "Event not found",
        event: null,
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
        sourceUrl: true,
        embedUrl: true,
        isPrimary: true,
        priority: true,
        playbackHlsUrl: true,
        playbackDashUrl: true,
        youtubeVideoId: true,
        youtubeChannelId: true,
        youtubeChannelName: true,
        youtubeThumbnailUrl: true,
        youtubeEmbeddable: true,
        youtubeLiveStatus: true,
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

    const normalizedEvent = {
      id: event.id,
      slug: event.slug,
      title: event.title,
      description: event.description || null,
      heroImageUrl: event.heroImageUrl || null,
      startAt: event.startAt,
      endAt: event.endAt,
      venueName: event.venueName || null,
      addressLine1: event.addressLine1 || null,
      city: event.city || null,
      state: event.state || null,
      country: event.country || null,
      categoryId: event.categoryId || null,
      category: event.category || null,
    };

    return {
      ok: true,

      event: normalizedEvent,

      eventId: normalizedEvent.id,
      eventSlug: normalizedEvent.slug,
      eventTitle: normalizedEvent.title,
      eventDescription: normalizedEvent.description,
      eventHeroImageUrl: normalizedEvent.heroImageUrl,
      eventStartAt: normalizedEvent.startAt,
      eventEndAt: normalizedEvent.endAt,
      eventVenueName: normalizedEvent.venueName,
      eventAddress: normalizedEvent.addressLine1,
      eventCity: normalizedEvent.city,
      eventState: normalizedEvent.state,
      eventCountry: normalizedEvent.country,
      eventCategory: normalizedEvent.category,

      primaryStream,
      streams: normalizedStreams,
    };
  }
}