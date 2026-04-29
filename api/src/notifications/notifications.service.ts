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

    if (!stream) return { ok: false, error: "Stream not found" };
    if (stream.moderationStatus !== "APPROVED") {
      return { ok: false, error: "Stream is not approved" };
    }

    const existing = await this.prisma.notificationLog.findFirst({
      where: {
        type: "LIVE_NOW",
        streamId: stream.id,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return { ok: true, skipped: true, reason: "LIVE_NOW already created", notification: existing };
    }

    const eventTitle = stream.event?.title || "MotorXLive Event";
    const streamTitle = stream.title || "Live Feed";

    const notification = await this.prisma.notificationLog.create({
      data: {
        type: "LIVE_NOW",
        status: "CREATED",
        title: `LIVE NOW: ${eventTitle}`,
        message: `${streamTitle} is live on MotorXLive.`,
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

    return { ok: true, notification };
  }

  async createLiveNowIfStreamIsLive(streamId: string) {
    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: {
        id: true,
        lifecycle: true,
        moderationStatus: true,
      },
    });

    if (!stream) return { ok: false, error: "Stream not found" };

    if (stream.lifecycle !== "LIVE") {
      return { ok: true, skipped: true, reason: "Stream is not LIVE" };
    }

    if (stream.moderationStatus !== "APPROVED") {
      return { ok: true, skipped: true, reason: "Stream is not approved" };
    }

    return this.createLiveNowNotification(streamId);
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