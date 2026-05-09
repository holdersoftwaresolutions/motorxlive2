import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

function envBool(name: string, defaultValue = false) {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return value === "true";
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async createLiveNowNotification(streamId: string) {
    const notificationsEnabled = envBool("YOUTUBE_NOTIFICATIONS_ENABLED", false);

    if (!notificationsEnabled) {
      await this.audit.audit({
        action: "LIVE_NOW_NOTIFICATION_SKIPPED",
        resource: "STREAM",
        resourceId: streamId,
        actorType: "SYSTEM",
        severity: "INFO",
        metadata: {
          reason: "YOUTUBE_NOTIFICATIONS_ENABLED is false",
        },
      });

      return {
        ok: true,
        skipped: true,
        reason: "Notifications disabled",
      };
    }

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
            eventSource: true,
            eventReviewStatus: true,
          },
        },
      },
    });

    if (!stream) {
      return { ok: false, error: "Stream not found" };
    }

    if (stream.lifecycle !== "LIVE") {
      return {
        ok: true,
        skipped: true,
        reason: "Stream is not LIVE",
      };
    }

    if (stream.moderationStatus !== "APPROVED") {
      return {
        ok: true,
        skipped: true,
        reason: "Stream is not approved",
      };
    }

    if (!stream.event) {
      return {
        ok: true,
        skipped: true,
        reason: "Stream has no event",
      };
    }

    if (
      stream.event.eventSource === "YOUTUBE_AUTO" &&
      stream.event.eventReviewStatus !== "PUBLISHED"
    ) {
      await this.audit.audit({
        action: "LIVE_NOW_NOTIFICATION_SKIPPED",
        resource: "STREAM",
        resourceId: stream.id,
        actorType: "SYSTEM",
        severity: "WARN",
        metadata: {
          reason: "Auto-created event is not published",
          eventId: stream.event.id,
          eventSource: stream.event.eventSource,
          eventReviewStatus: stream.event.eventReviewStatus,
        },
      });

      return {
        ok: true,
        skipped: true,
        reason: "Auto-created event is not published",
      };
    }

    const existing = await this.prisma.notificationLog.findFirst({
      where: {
        type: "LIVE_NOW",
        streamId: stream.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (existing) {
      return {
        ok: true,
        skipped: true,
        reason: "LIVE_NOW already created for stream",
        notification: existing,
      };
    }

    const eventTitle = stream.event.title || "MotorXLive Event";
    const streamTitle = stream.title || "Live Feed";

    const notification = await this.prisma.notificationLog.create({
      data: {
        type: "LIVE_NOW",
        status: "CREATED",
        title: `LIVE NOW: ${eventTitle}`,
        message: `${streamTitle} is live on MotorXLive.`,
        eventId: stream.eventId,
        eventSlug: stream.event.slug || null,
        streamId: stream.id,
        payload: {
          streamId: stream.id,
          streamTitle,
          eventId: stream.eventId,
          eventTitle,
          eventSlug: stream.event.slug || null,
          youtubeVideoId: stream.youtubeVideoId || null,
          provider: stream.provider || null,
          lifecycle: stream.lifecycle,
          url: stream.event.slug ? `/events/${stream.event.slug}` : null,
        },
      },
    });

    await this.audit.audit({
      action: "LIVE_NOW_NOTIFICATION_CREATED",
      resource: "NOTIFICATION",
      resourceId: notification.id,
      actorType: "SYSTEM",
      severity: "INFO",
      metadata: {
        streamId: stream.id,
        eventId: stream.eventId,
        eventSlug: stream.event.slug,
        youtubeVideoId: stream.youtubeVideoId,
      },
    });

    return {
      ok: true,
      notification,
    };
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

    if (!stream) {
      return { ok: false, error: "Stream not found" };
    }

    if (stream.lifecycle !== "LIVE") {
      return {
        ok: true,
        skipped: true,
        reason: "Stream is not LIVE",
      };
    }

    if (stream.moderationStatus !== "APPROVED") {
      return {
        ok: true,
        skipped: true,
        reason: "Stream is not approved",
      };
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