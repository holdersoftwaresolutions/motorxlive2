import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { YouTubeClient } from "./youtube-client";
import { NotificationsService } from "../notifications/notifications.service";
import { classifyYouTubeChannel } from "./youtube-classifier";
import { scoreYouTubeChannel } from "./youtube-scoring";

const DEFAULT_SEARCH_TERMS = [
  "drag racing live",
  "no prep racing live",
  "bracket racing live",
  "radial racing live",
  "grudge racing live",
  "offroad racing live",
  "sxs racing live",
  "utv racing live",
  "motorsports podcast",
  "drag racing podcast",
];

const DEFAULT_EVENT_TYPES: Array<"live" | "upcoming" | "completed"> = [
  "live",
  "upcoming",
  "completed",
];

type TrustLevel = "REVIEW_REQUIRED" | "AUTO_INGEST_REVIEW" | "AUTO_PUBLISH";

@Injectable()
export class YouTubeDiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly youtube: YouTubeClient,
    private readonly notifications: NotificationsService
  ) {}

  async discoverChannels(options?: {
    terms?: string[];
    maxResultsPerSearch?: number;
  }) {
    const terms = options?.terms?.length ? options.terms : DEFAULT_SEARCH_TERMS;
    const maxResults = options?.maxResultsPerSearch ?? 5;

    const discoveredVideoIds = new Set<string>();

    for (const term of terms) {
      for (const eventType of DEFAULT_EVENT_TYPES) {
        const search = await this.youtube.searchVideos({
          query: term,
          eventType,
          maxResults,
        });

        await this.prisma.youTubeApiUsageLog.create({
          data: {
            method: "search.list",
            quotaCost: 100,
            query: `${term} | ${eventType}`,
          },
        });

        for (const item of search.items || []) {
          const videoId = item?.id?.videoId;
          if (typeof videoId === "string" && videoId.length > 0) {
            discoveredVideoIds.add(videoId);
          }
        }
      }
    }

    const videoIds = Array.from(discoveredVideoIds);
    const videosResponse = await this.youtube.getVideos(videoIds);

    await this.prisma.youTubeApiUsageLog.create({
      data: {
        method: "videos.list",
        quotaCost: 1,
        query: `${videoIds.length} videos`,
      },
    });

    const videos = videosResponse.items || [];

    const channelIds: string[] = Array.from(
      new Set<string>(
        videos
          .map((video: any) => video?.snippet?.channelId)
          .filter(
            (channelId: unknown): channelId is string =>
              typeof channelId === "string" && channelId.length > 0
          )
      )
    );

    const channelsResponse = await this.youtube.getChannels(channelIds);

    await this.prisma.youTubeApiUsageLog.create({
      data: {
        method: "channels.list",
        quotaCost: 1,
        query: `${channelIds.length} channels`,
      },
    });

    const channelVideoMap = new Map<string, any[]>();

    for (const video of videos) {
      const channelId = video?.snippet?.channelId;
      if (typeof channelId !== "string" || !channelId) continue;

      const list = channelVideoMap.get(channelId) || [];
      list.push(video);
      channelVideoMap.set(channelId, list);
    }

    const savedChannels = [];

    for (const channel of channelsResponse.items || []) {
      const channelId = channel.id;
      const relatedVideos = channelVideoMap.get(channelId) || [];

      const liveCount = relatedVideos.filter(
        (v) => v?.snippet?.liveBroadcastContent === "live"
      ).length;

      const upcomingCount = relatedVideos.filter(
        (v) => v?.snippet?.liveBroadcastContent === "upcoming"
      ).length;

      const completedCount = relatedVideos.filter(
        (v) => !!v?.liveStreamingDetails?.actualEndTime
      ).length;

      const embeddableCount = relatedVideos.filter(
        (v) => v?.status?.embeddable === true
      ).length;

      const videoTitles = relatedVideos
        .map((v) => v?.snippet?.title)
        .filter((title: unknown): title is string => typeof title === "string");

      const category = classifyYouTubeChannel({
        title: channel?.snippet?.title,
        description: channel?.snippet?.description,
        videoTitles,
      });

      const scored = scoreYouTubeChannel({
        title: channel?.snippet?.title,
        description: channel?.snippet?.description,
        videoTitles,
        liveCount,
        upcomingCount,
        completedCount,
        embeddableCount,
        totalVideosChecked: relatedVideos.length,
      });

      const thumbnailUrl =
        channel?.snippet?.thumbnails?.high?.url ||
        channel?.snippet?.thumbnails?.medium?.url ||
        channel?.snippet?.thumbnails?.default?.url ||
        null;

      const saved = await this.prisma.youTubeDiscoveredChannel.upsert({
        where: { youtubeChannelId: channelId },
        update: {
          title: channel?.snippet?.title || "Untitled Channel",
          description: channel?.snippet?.description || null,
          thumbnailUrl,
          channelUrl: `https://www.youtube.com/channel/${channelId}`,
          category,
          score: scored.score,
          scoreReasons: scored.reasons,
          recentLiveCount: liveCount,
          upcomingLiveCount: upcomingCount,
          completedLiveCount: completedCount,
          subscriberCount: channel?.statistics?.subscriberCount
            ? Number(channel.statistics.subscriberCount)
            : null,
          videoCount: channel?.statistics?.videoCount
            ? Number(channel.statistics.videoCount)
            : null,
          viewCount: channel?.statistics?.viewCount
            ? Number(channel.statistics.viewCount)
            : null,
          uploadsPlaylistId:
            channel?.contentDetails?.relatedPlaylists?.uploads || null,
          lastDiscoveredAt: new Date(),
        },
        create: {
          youtubeChannelId: channelId,
          title: channel?.snippet?.title || "Untitled Channel",
          description: channel?.snippet?.description || null,
          thumbnailUrl,
          channelUrl: `https://www.youtube.com/channel/${channelId}`,
          category,
          score: scored.score,
          scoreReasons: scored.reasons,
          recentLiveCount: liveCount,
          upcomingLiveCount: upcomingCount,
          completedLiveCount: completedCount,
          subscriberCount: channel?.statistics?.subscriberCount
            ? Number(channel.statistics.subscriberCount)
            : null,
          videoCount: channel?.statistics?.videoCount
            ? Number(channel.statistics.videoCount)
            : null,
          viewCount: channel?.statistics?.viewCount
            ? Number(channel.statistics.viewCount)
            : null,
          uploadsPlaylistId:
            channel?.contentDetails?.relatedPlaylists?.uploads || null,
        },
      });

      savedChannels.push(saved);

      for (const video of relatedVideos) {
        await this.upsertDiscoveredVideo(video, category);
      }
    }

    return {
      ok: true,
      videoCount: videoIds.length,
      channelCount: savedChannels.length,
      channels: savedChannels,
    };
  }

  private async upsertDiscoveredVideo(video: any, category: any) {
    const videoId = video.id;
    const snippet = video.snippet || {};
    const live = video.liveStreamingDetails || {};
    const status = video.status || {};
    const statistics = video.statistics || {};

    const thumbnailUrl =
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      null;

    return this.prisma.youTubeDiscoveredVideo.upsert({
      where: { youtubeVideoId: videoId },
      update: {
        youtubeChannelId: snippet.channelId,
        title: snippet.title || "Untitled Video",
        description: snippet.description || null,
        thumbnailUrl,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        liveBroadcastContent: snippet.liveBroadcastContent || null,
        scheduledStartTime: live.scheduledStartTime
          ? new Date(live.scheduledStartTime)
          : null,
        actualStartTime: live.actualStartTime ? new Date(live.actualStartTime) : null,
        actualEndTime: live.actualEndTime ? new Date(live.actualEndTime) : null,
        publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : null,
        embeddable: status.embeddable ?? null,
        duration: video.contentDetails?.duration || null,
        viewCount: statistics.viewCount ? Number(statistics.viewCount) : null,
        likeCount: statistics.likeCount ? Number(statistics.likeCount) : null,
        category,
      },
      create: {
        youtubeVideoId: videoId,
        youtubeChannelId: snippet.channelId,
        title: snippet.title || "Untitled Video",
        description: snippet.description || null,
        thumbnailUrl,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        liveBroadcastContent: snippet.liveBroadcastContent || null,
        scheduledStartTime: live.scheduledStartTime
          ? new Date(live.scheduledStartTime)
          : null,
        actualStartTime: live.actualStartTime ? new Date(live.actualStartTime) : null,
        actualEndTime: live.actualEndTime ? new Date(live.actualEndTime) : null,
        publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : null,
        embeddable: status.embeddable ?? null,
        duration: video.contentDetails?.duration || null,
        viewCount: statistics.viewCount ? Number(statistics.viewCount) : null,
        likeCount: statistics.likeCount ? Number(statistics.likeCount) : null,
        category,
      },
    });
  }

  async listDiscoveredChannels() {
    return this.prisma.youTubeDiscoveredChannel.findMany({
      orderBy: [{ discoveryStatus: "asc" }, { score: "desc" }],
      include: {
        videos: {
          take: 5,
          orderBy: [{ publishedAt: "desc" }],
        },
      },
    });
  }

  async approveChannel(id: string) {
    return this.prisma.youTubeDiscoveredChannel.update({
      where: { id },
      data: {
        discoveryStatus: "APPROVED",
      },
    });
  }

  async ignoreChannel(id: string) {
    return this.prisma.youTubeDiscoveredChannel.update({
      where: { id },
      data: {
        discoveryStatus: "IGNORED",
      },
    });
  }

  async listApprovedChannels() {
    return this.prisma.youTubeDiscoveredChannel.findMany({
      where: {
        discoveryStatus: "APPROVED",
      },
      orderBy: [{ priority: "asc" }, { score: "desc" }, { title: "asc" }],
      include: {
        videos: {
          take: 8,
          orderBy: [{ publishedAt: "desc" }],
        },
      },
    });
  }

  async updateApprovedChannelSettings(
    id: string,
    dto: {
      category?: any;
      autoIngestStreams?: boolean;
      autoIngestVideos?: boolean;
      autoIngestPodcasts?: boolean;
      isFeatured?: boolean;
      priority?: number;
      isTrusted?: boolean;
      trustLevel?: TrustLevel;
    }
  ) {
    const trustLevel = dto.trustLevel;

    return this.prisma.youTubeDiscoveredChannel.update({
      where: { id },
      data: {
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.autoIngestStreams !== undefined
          ? { autoIngestStreams: dto.autoIngestStreams }
          : {}),
        ...(dto.autoIngestVideos !== undefined
          ? { autoIngestVideos: dto.autoIngestVideos }
          : {}),
        ...(dto.autoIngestPodcasts !== undefined
          ? { autoIngestPodcasts: dto.autoIngestPodcasts }
          : {}),
        ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
        ...(dto.priority !== undefined ? { priority: Number(dto.priority || 0) } : {}),
        ...(trustLevel !== undefined
          ? {
              trustLevel: trustLevel as any,
              isTrusted: trustLevel === "AUTO_PUBLISH",
            }
          : {}),
        ...(dto.isTrusted !== undefined && trustLevel === undefined
          ? { isTrusted: dto.isTrusted }
          : {}),
      },
    });
  }

  async monitorApprovedChannels() {
    const channels = await this.prisma.youTubeDiscoveredChannel.findMany({
      where: {
        discoveryStatus: "APPROVED",
        uploadsPlaylistId: {
          not: null,
        },
      },
      orderBy: [{ priority: "asc" }, { score: "desc" }],
    });

    const results = [];

    for (const channel of channels) {
      const result = await this.monitorChannel(channel.id);
      results.push(result);
    }

    return {
      ok: true,
      monitoredCount: results.length,
      results,
    };
  }

  async monitorChannel(id: string) {
    const channel = await this.prisma.youTubeDiscoveredChannel.findUnique({
      where: { id },
    });

    if (!channel) {
      return { ok: false, error: "Channel not found" };
    }

    if (!channel.uploadsPlaylistId) {
      return { ok: false, error: "Channel does not have an uploads playlist" };
    }

    const uploads = await this.youtube.getRecentUploads(channel.uploadsPlaylistId, 10);

    await this.prisma.youTubeApiUsageLog.create({
      data: {
        method: "playlistItems.list",
        quotaCost: 1,
        query: `${channel.title} recent uploads`,
      },
    });

    const videoIds: string[] = (uploads.items || [])
      .map((item: any) => item?.contentDetails?.videoId)
      .filter(
        (videoId: unknown): videoId is string =>
          typeof videoId === "string" && videoId.length > 0
      );

    const videosResponse = await this.youtube.getVideos(videoIds);

    await this.prisma.youTubeApiUsageLog.create({
      data: {
        method: "videos.list",
        quotaCost: 1,
        query: `${channel.title} ${videoIds.length} videos`,
      },
    });

    const videos = videosResponse.items || [];

    let liveCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;

    for (const video of videos) {
      const status = video?.snippet?.liveBroadcastContent;

      if (status === "live") liveCount += 1;
      if (status === "upcoming") upcomingCount += 1;
      if (video?.liveStreamingDetails?.actualEndTime) completedCount += 1;

      await this.upsertDiscoveredVideo(video, channel.category);
    }

    const updated = await this.prisma.youTubeDiscoveredChannel.update({
      where: { id },
      data: {
        recentLiveCount: liveCount,
        upcomingLiveCount: upcomingCount,
        completedLiveCount: completedCount,
        lastMonitoredAt: new Date(),
      },
      include: {
        videos: {
          take: 8,
          orderBy: [{ publishedAt: "desc" }],
        },
      },
    });

    return {
      ok: true,
      channelId: channel.id,
      title: channel.title,
      videoCount: videos.length,
      liveCount,
      upcomingCount,
      completedCount,
      channel: updated,
    };
  }

  private getStreamLifecycleFromYouTubeStatus(video: any) {
    const liveStatus = video.liveBroadcastContent;

    if (liveStatus === "live") return "LIVE";
    if (liveStatus === "upcoming") return "READY";
    if (video.actualEndTime) return "ENDED";

    return "READY";
  }

  private shouldIngestAsStream(video: any) {
    return (
      video.liveBroadcastContent === "live" ||
      video.liveBroadcastContent === "upcoming" ||
      !!video.scheduledStartTime ||
      !!video.actualStartTime
    );
  }

  private getModerationForChannel(channel: any) {
    if (channel?.trustLevel === "AUTO_PUBLISH") {
      return {
        needsReview: false,
        moderationStatus: "APPROVED" as any,
        rejectionReason: null,
        reviewedAt: new Date(),
      };
    }

    return {
      needsReview: true,
      moderationStatus: "PENDING" as any,
      rejectionReason: null,
      reviewedAt: null,
    };
  }

  async ingestDiscoveredVideo(id: string, options?: { eventId?: string }) {
    const discovered = await this.prisma.youTubeDiscoveredVideo.findUnique({
      where: { id },
      include: {
        channel: true,
      },
    });

    if (!discovered) {
      return { ok: false, error: "Discovered video not found" };
    }

    if (!discovered.embeddable) {
      await this.prisma.youTubeDiscoveredVideo.update({
        where: { id },
        data: {
          ingestionStatus: "FAILED",
          scoreReasons: ["Video is not embeddable"],
        },
      });

      return { ok: false, error: "Video is not embeddable" };
    }

    const ingestAsStream = this.shouldIngestAsStream(discovered);

    if (ingestAsStream) {
      return this.ingestDiscoveredVideoAsStream(discovered, options);
    }

    return this.ingestDiscoveredVideoAsVideo(discovered, options);
  }

  private async ingestDiscoveredVideoAsStream(
    discovered: any,
    options?: { eventId?: string }
  ) {
        const eventId = await this.resolveEventIdForIngestion(discovered, options);

        const existing = await this.prisma.stream.findFirst({
      where: {
        youtubeVideoId: discovered.youtubeVideoId,
      },
    });

    const moderation = this.getModerationForChannel(discovered.channel);

    if (existing) {
      const updated = await this.prisma.stream.update({
        where: { id: existing.id },
        data: {
          title: discovered.title || existing.title || "YouTube Live Feed",
          sourceType: "YOUTUBE" as any,
          provider: "YouTube",
          youtubeVideoId: discovered.youtubeVideoId,
          lifecycle: this.getStreamLifecycleFromYouTubeStatus(discovered) as any,
          playbackHlsUrl: null,
          playbackDashUrl: null,
          ...moderation,
        },
      });

      await this.notifications.createLiveNowIfStreamIsLive(updated.id);

      await this.prisma.youTubeDiscoveredVideo.update({
        where: { id: discovered.id },
        data: {
          ingestionStatus: "INGESTED",
          motorXStreamId: updated.id,
        },
      });

      return { ok: true, type: "stream", action: "updated", stream: updated };
    }

    const created = await this.prisma.stream.create({
      data: {
        eventId,
        sourceType: "YOUTUBE" as any,
        provider: "YouTube",
        title: discovered.title || "YouTube Live Feed",
        isPrimary: false,
        priority: discovered.channel?.priority ?? 0,
        playbackHlsUrl: null,
        playbackDashUrl: null,
        youtubeVideoId: discovered.youtubeVideoId,
        lifecycle: this.getStreamLifecycleFromYouTubeStatus(discovered) as any,
        ...moderation,
      },
    });

    await this.notifications.createLiveNowIfStreamIsLive(created.id);

    await this.prisma.youTubeDiscoveredVideo.update({
      where: { id: discovered.id },
      data: {
        ingestionStatus: "INGESTED",
        motorXStreamId: created.id,
      },
    });

    return { ok: true, type: "stream", action: "created", stream: created };
  }

  private async ingestDiscoveredVideoAsVideo(
    discovered: any,
    options?: { eventId?: string }
  ) {
    const eventId = await this.resolveEventIdForIngestion(discovered, options);

    const existing = await this.prisma.video.findFirst({
      where: {
        youtubeVideoId: discovered.youtubeVideoId,
      },
    });

    const moderation = this.getModerationForChannel(discovered.channel);

    if (existing) {
      const updated = await this.prisma.video.update({
        where: { id: existing.id },
        data: {
          title: discovered.title || existing.title || "YouTube Video",
          description: discovered.description || existing.description,
          sourceType: "YOUTUBE" as any,
          provider: "YouTube",
          youtubeVideoId: discovered.youtubeVideoId,
          playbackHlsUrl: null,
          playbackDashUrl: null,
          publishedAt: discovered.publishedAt || existing.publishedAt,
          status: "READY" as any,
          ...moderation,
        },
      });

      await this.prisma.youTubeDiscoveredVideo.update({
        where: { id: discovered.id },
        data: {
          ingestionStatus: "INGESTED",
          motorXVideoId: updated.id,
        },
      });

      return { ok: true, type: "video", action: "updated", video: updated };
    }

    const created = await this.prisma.video.create({
      data: {
        eventId,
        sourceType: "YOUTUBE" as any,
        provider: "YouTube",
        title: discovered.title || "YouTube Video",
        description: discovered.description || null,
        playbackHlsUrl: null,
        playbackDashUrl: null,
        youtubeVideoId: discovered.youtubeVideoId,
        durationSeconds: null,
        publishedAt: discovered.publishedAt || null,
        status: "READY" as any,
        ...moderation,
      },
    });

    await this.prisma.youTubeDiscoveredVideo.update({
      where: { id: discovered.id },
      data: {
        ingestionStatus: "INGESTED",
        motorXVideoId: created.id,
      },
    });

    return { ok: true, type: "video", action: "created", video: created };
  }

  async ingestReadyVideosForChannel(channelId: string, options?: { eventId?: string }) {
    const channel = await this.prisma.youTubeDiscoveredChannel.findUnique({
      where: { id: channelId },
      include: {
        videos: {
          where: {
            ingestionStatus: {
              in: ["DISCOVERED", "READY_TO_INGEST", "FAILED"],
            },
            embeddable: true,
          },
          orderBy: [{ publishedAt: "desc" }],
        },
      },
    });

    if (!channel) {
      return { ok: false, error: "Channel not found" };
    }

    const results = [];

    for (const video of channel.videos) {
      const result = await this.ingestDiscoveredVideo(video.id, {
        eventId: options?.eventId,
      });

      results.push(result);
    }

    return {
      ok: true,
      channelId,
      channelTitle: channel.title,
      attempted: channel.videos.length,
      results,
    };
  }

  async autoIngestApprovedChannels(options?: { eventId?: string }) {
    const channels = await this.prisma.youTubeDiscoveredChannel.findMany({
      where: {
        discoveryStatus: "APPROVED",
        OR: [
          { autoIngestStreams: true },
          { autoIngestVideos: true },
          { autoIngestPodcasts: true },
        ],
      },
      include: {
        videos: {
          where: {
            ingestionStatus: {
              in: ["DISCOVERED", "READY_TO_INGEST"],
            },
            embeddable: true,
          },
          orderBy: [{ publishedAt: "desc" }],
        },
      },
    });

    const results = [];

    for (const channel of channels) {
      for (const video of channel.videos) {
        if (channel.trustLevel === "REVIEW_REQUIRED") continue;

        const ingestAsStream = this.shouldIngestAsStream(video);

        if (ingestAsStream && !channel.autoIngestStreams) continue;

        if (!ingestAsStream && !channel.autoIngestVideos && !channel.autoIngestPodcasts) {
          continue;
        }

        results.push(
          await this.ingestDiscoveredVideo(video.id, {
            eventId: options?.eventId,
          })
        );
      }
    }

    return {
      ok: true,
      channelCount: channels.length,
      attempted: results.length,
      processed: results.length,
      results,
    };
  }

  async listDiscoveredVideos() {
    return this.prisma.youTubeDiscoveredVideo.findMany({
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: {
        channel: true,
      },
    });
  }

    private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  private async getUniqueEventSlug(baseTitle: string) {
    const base = this.slugify(baseTitle || "youtube-event") || "youtube-event";
    let slug = base;
    let counter = 2;

    while (await this.prisma.event.findUnique({ where: { slug } })) {
      slug = `${base}-${counter}`;
      counter += 1;
    }

    return slug;
  }

  private async findCategoryIdForYouTubeCategory(category?: string | null) {
    if (!category) return null;

    const categoryNameMap: Record<string, string[]> = {
      DRAG_RACING: ["Drag Racing", "Racing", "Motorsports"],
      OFFROAD: ["Offroad", "Off-Road", "Motorsports"],
      SXS_UTV: ["SXS / UTV", "UTV", "Motorsports"],
      MOTORSPORTS_PODCAST: ["Podcasts", "Motorsports"],
      GENERAL_MOTORSPORTS: ["Motorsports"],
      TRACK_CHANNEL: ["Tracks", "Motorsports"],
      EVENT_PROMOTER: ["Events", "Motorsports"],
      CREATOR_MEDIA: ["Media", "Motorsports"],
    };

    const names = categoryNameMap[category] || ["Motorsports"];

    const found = await this.prisma.category.findFirst({
      where: {
        OR: names.map((name) => ({
          name: {
            equals: name,
            mode: "insensitive",
          },
        })),
      },
      select: {
        id: true,
      },
    });

    return found?.id || null;
  }

  private async createHoldingEventForYouTubeVideo(discovered: any) {
    const existing = await this.prisma.event.findFirst({
      where: {
        autoCreatedFromYoutubeVideoId: discovered.youtubeVideoId,
        eventSource: "YOUTUBE_AUTO" as any,
      },
    });

    if (existing) return existing;

    const startAt =
      discovered.scheduledStartTime ||
      discovered.actualStartTime ||
      discovered.publishedAt ||
      new Date();

    const endAt = new Date(new Date(startAt).getTime() + 4 * 60 * 60 * 1000);

    const title = discovered.title || "YouTube Live Event";
    const slug = await this.getUniqueEventSlug(`youtube-${title}`);

    const categoryId = await this.findCategoryIdForYouTubeCategory(
      discovered.channel?.category
    );

    const data: any = {
      title,
      slug,
      description: discovered.description || null,
      startAt: new Date(startAt),
      endAt,
      heroImageUrl: discovered.thumbnailUrl || null,
      eventSource: "YOUTUBE_AUTO",
      eventReviewStatus: "NEEDS_REVIEW",
      autoCreatedFromYoutubeVideoId: discovered.youtubeVideoId,
      autoCreatedFromYoutubeChannelId: discovered.youtubeChannelId,
      venueName: discovered.channel?.title || "YouTube",
      city: null,
      state: null,
    };

    if (categoryId) {
      data.categoryId = categoryId;
    }

    return this.prisma.event.create({
      data,
    });
  }

  private async resolveEventIdForIngestion(
    discovered: any,
    options?: { eventId?: string }
  ) {
    if (options?.eventId) return options.eventId;

    const holdingEvent = await this.createHoldingEventForYouTubeVideo(discovered);
    return holdingEvent.id;
  }

    async listAutoCreatedEvents() {
    return this.prisma.event.findMany({
      where: {
        eventSource: "YOUTUBE_AUTO" as any,
        eventReviewStatus: {
          in: ["NEEDS_REVIEW", "PUBLISHED", "ARCHIVED", "MERGED"] as any,
        },
      },
      orderBy: [{ startAt: "desc" }],
      include: {
        category: true,
        streams: {
          orderBy: [{ updatedAt: "desc" }],
        },
        videos: {
          orderBy: [{ createdAt: "desc" }],
        },
      },
    });
  }

  async approveAutoCreatedEvent(id: string) {
    return this.prisma.event.update({
      where: { id },
      data: {
        eventReviewStatus: "PUBLISHED" as any,
      },
      include: {
        streams: true,
        videos: true,
        category: true,
      },
    });
  }

  async archiveAutoCreatedEvent(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        streams: true,
        videos: true,
      },
    });

    if (!event) {
      return { ok: false, error: "Auto-created event not found" };
    }

    if (event.eventSource !== "YOUTUBE_AUTO") {
      return { ok: false, error: "Only YouTube auto-created events can be archived here" };
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        eventReviewStatus: "ARCHIVED" as any,
      },
      include: {
        streams: true,
        videos: true,
        category: true,
      },
    });
  }

  async mergeAutoCreatedEvent(id: string, targetEventId: string) {
    if (!targetEventId) {
      return { ok: false, error: "targetEventId is required" };
    }

    if (id === targetEventId) {
      return { ok: false, error: "Cannot merge an event into itself" };
    }

    const sourceEvent = await this.prisma.event.findUnique({
      where: { id },
      include: {
        streams: true,
        videos: true,
      },
    });

    if (!sourceEvent) {
      return { ok: false, error: "Auto-created event not found" };
    }

    if (sourceEvent.eventSource !== "YOUTUBE_AUTO") {
      return { ok: false, error: "Only YouTube auto-created events can be merged here" };
    }

    const targetEvent = await this.prisma.event.findUnique({
      where: { id: targetEventId },
    });

    if (!targetEvent) {
      return { ok: false, error: "Target event not found" };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const movedStreams = await tx.stream.updateMany({
        where: { eventId: id },
        data: { eventId: targetEventId },
      });

      const movedVideos = await tx.video.updateMany({
        where: { eventId: id },
        data: { eventId: targetEventId },
      });

      const updatedSource = await tx.event.update({
        where: { id },
        data: {
          eventReviewStatus: "MERGED" as any,
          mergedIntoEventId: targetEventId,
        },
      });

      return {
        movedStreams: movedStreams.count,
        movedVideos: movedVideos.count,
        sourceEvent: updatedSource,
        targetEvent,
      };
    });

    return {
      ok: true,
      ...result,
    };
  }
}