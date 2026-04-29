import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { YouTubeClient } from "./youtube-client";
import { NotificationsService } from "../notifications/notifications.service";
import { classifyYouTubeChannel } from "./youtube-classifier";
import { scoreYouTubeChannel } from "./youtube-scoring";

type TrustLevel = "REVIEW_REQUIRED" | "AUTO_INGEST_REVIEW" | "AUTO_PUBLISH";

@Injectable()
export class YouTubeDiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly youtube: YouTubeClient,
    private readonly notifications: NotificationsService
  ) {}

  // =========================
  // HELPERS
  // =========================

  private shouldIngestAsStream(video: any) {
    return (
      video.liveBroadcastContent === "live" ||
      video.liveBroadcastContent === "upcoming" ||
      !!video.scheduledStartTime ||
      !!video.actualStartTime
    );
  }

  private getStreamLifecycleFromYouTubeStatus(video: any) {
    if (video.liveBroadcastContent === "live") return "LIVE";
    if (video.liveBroadcastContent === "upcoming") return "READY";
    if (video.actualEndTime) return "ENDED";
    return "READY";
  }

  private getModerationForChannel(channel: any) {
    if (channel?.trustLevel === "AUTO_PUBLISH") {
      return {
        needsReview: false,
        moderationStatus: "APPROVED" as any,
        reviewedAt: new Date(),
        rejectionReason: null,
      };
    }

    return {
      needsReview: true,
      moderationStatus: "PENDING" as any,
      reviewedAt: null,
      rejectionReason: null,
    };
  }

  // =========================
  // INGEST ENTRY POINT
  // =========================

  async ingestDiscoveredVideo(id: string, options?: { eventId?: string }) {
    const discovered = await this.prisma.youTubeDiscoveredVideo.findUnique({
      where: { id },
      include: { channel: true },
    });

    if (!discovered) return { ok: false, error: "Not found" };
    if (!discovered.embeddable) return { ok: false, error: "Not embeddable" };

    if (this.shouldIngestAsStream(discovered)) {
      return this.ingestStream(discovered, options);
    }

    return this.ingestVideo(discovered, options);
  }

  // =========================
  // STREAM INGEST
  // =========================

  private async ingestStream(discovered: any, options?: { eventId?: string }) {
    if (!options?.eventId) {
      return { ok: false, needsEvent: true };
    }

    const moderation = this.getModerationForChannel(discovered.channel);

    const existing = await this.prisma.stream.findFirst({
      where: { youtubeVideoId: discovered.youtubeVideoId },
    });

    if (existing) {
      const updated = await this.prisma.stream.update({
        where: { id: existing.id },
        data: {
          title: discovered.title,
          lifecycle: this.getStreamLifecycleFromYouTubeStatus(discovered) as any,
          ...moderation,
        },
      });

      // 🔥 AUTO LIVE NOTIFICATION
      await this.notifications.createLiveNowIfStreamIsLive(updated.id);

      return { ok: true, updated };
    }

    const created = await this.prisma.stream.create({
      data: {
        eventId: options.eventId,
        sourceType: "YOUTUBE" as any,
        provider: "YouTube",
        title: discovered.title,
        youtubeVideoId: discovered.youtubeVideoId,
        lifecycle: this.getStreamLifecycleFromYouTubeStatus(discovered) as any,
        priority: discovered.channel?.priority ?? 0,
        ...moderation,
      },
    });

    // 🔥 AUTO LIVE NOTIFICATION
    await this.notifications.createLiveNowIfStreamIsLive(created.id);

    return { ok: true, created };
  }

  // =========================
  // VIDEO INGEST
  // =========================

  private async ingestVideo(discovered: any, options?: { eventId?: string }) {
    if (!options?.eventId) {
      return { ok: false, needsEvent: true };
    }

    const moderation = this.getModerationForChannel(discovered.channel);

    const existing = await this.prisma.video.findFirst({
      where: { youtubeVideoId: discovered.youtubeVideoId },
    });

    if (existing) {
      const updated = await this.prisma.video.update({
        where: { id: existing.id },
        data: {
          title: discovered.title,
          description: discovered.description,
          ...moderation,
        },
      });

      return { ok: true, updated };
    }

    const created = await this.prisma.video.create({
      data: {
        eventId: options.eventId,
        sourceType: "YOUTUBE" as any,
        provider: "YouTube",
        title: discovered.title,
        description: discovered.description,
        youtubeVideoId: discovered.youtubeVideoId,
        ...moderation,
      },
    });

    return { ok: true, created };
  }

  // =========================
  // AUTO INGEST
  // =========================

  async autoIngestApprovedChannels(options?: { eventId?: string }) {
    const channels = await this.prisma.youTubeDiscoveredChannel.findMany({
      where: {
        discoveryStatus: "APPROVED",
      },
      include: {
        videos: {
          where: {
            ingestionStatus: { in: ["DISCOVERED", "READY_TO_INGEST"] },
            embeddable: true,
          },
        },
      },
    });

    const results = [];

    for (const channel of channels) {
      if (channel.trustLevel === "REVIEW_REQUIRED") continue;

      for (const video of channel.videos) {
        const ingestAsStream = this.shouldIngestAsStream(video);

        if (ingestAsStream && !channel.autoIngestStreams) continue;
        if (!ingestAsStream && !channel.autoIngestVideos) continue;

        const result = await this.ingestDiscoveredVideo(video.id, options);
        results.push(result);
      }
    }

    return {
      ok: true,
      processed: results.length,
    };
  }
}