import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createLiveNowNotification(streamId: string) {
    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startAt: true,
            venueName: true,
            city: true,
            state: true,
          },
        },
      },
    });

    if (!stream) {
      return { ok: false, error: "Stream not found" };
    }

    if (stream.moderationStatus !== "APPROVED") {
      return { ok: false, error: "Stream is not approved" };
    }

    const eventTitle = stream.event?.title || "MotorXLive Event";
    const streamTitle = stream.title || "Live Feed";

    const title = `LIVE NOW: ${eventTitle}`;
    const message = `${streamTitle} is live on MotorXLive.`;

    const notification = await this.prisma.notificationLog.create({
      data: {
        type: "LIVE_NOW",
        status: "CREATED",
        title,
        message,
        eventId: stream.eventId,
        eventSlug: stream.event?.slug || null,
        streamId: stream.id,
        payload: {
          streamId: stream.id,
          streamTitle,
          eventId: stream.eventId,
          eventTitle,
          eventSlug: stream.event?.slug || null,
          youtubeVideoId: stream.youtubeVideoId || null,
          provider: stream.provider || null,
          lifecycle: stream.lifecycle,
          url: stream.event?.slug ? `/events/${stream.event.slug}` : null,
        },
      },
    });

    return {
      ok: true,
      notification,
    };
  }

  async markNotificationSent(id: string) {
    return this.prisma.notificationLog.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });
  }

  async markNotificationFailed(id: string, error: string) {
    return this.prisma.notificationLog.update({
      where: { id },
      data: {
        status: "FAILED",
        error,
      },
    });
  }

  async listNotifications() {
    return this.prisma.notificationLog.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    });
  }
}