import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import {
  SubmitVideoDto,
  UpdateSubmittedVideoDto,
} from "./contributor-videos.dto";
import {
  SubmitStreamDto,
  UpdateSubmittedStreamDto,
} from "../streamer/streamer-streams.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("STREAMER", "MEDIA", "ADMIN")
@Controller("contributor")
export class ContributorController {
  constructor(private readonly prisma: PrismaService) {}

  private getUserId(req: any): string | null {
    return req?.user?.sub ?? null;
  }

  private getUserRole(req: any): string | null {
    return req?.user?.role ?? null;
  }

  @Get("events")
  async listContributorEvents() {
    const now = new Date();
    const recentPast = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return this.prisma.event.findMany({
      where: {
        OR: [
          {
            endAt: {
              gte: now,
            },
          },
          {
            endAt: null,
            startAt: {
              gte: recentPast,
            },
          },
        ],
      },
      orderBy: [{ startAt: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        startAt: true,
        endAt: true,
        venueName: true,
        city: true,
        state: true,
      },
    });
  }

  @Get("dashboard")
  async getContributorDashboard(@Req() req: any) {
    const userId = this.getUserId(req);
    const role = this.getUserRole(req);

    if (!userId) {
      throw new ForbiddenException("Missing user");
    }

    const [recentStreams, recentVideos] = await Promise.all([
      this.prisma.stream.findMany({
        where: role === "ADMIN" ? {} : { submittedByUserId: userId },
        orderBy: [{ createdAt: "desc" }],
        take: 5,
        include: {
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              startAt: true,
            },
          },
        },
      }),
      this.prisma.video.findMany({
        where: role === "ADMIN" ? {} : { submittedByUserId: userId },
        orderBy: [{ createdAt: "desc" }],
        take: 5,
        include: {
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              startAt: true,
            },
          },
        },
      }),
    ]);

    const streamSummary = recentStreams.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.moderationStatus === "APPROVED") acc.approved += 1;
        else if (item.moderationStatus === "REJECTED") acc.rejected += 1;
        else acc.pending += 1;
        if (item.lifecycle === "LIVE") acc.live += 1;
        return acc;
      },
      { total: 0, approved: 0, rejected: 0, pending: 0, live: 0 }
    );

    const videoSummary = recentVideos.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.moderationStatus === "APPROVED") acc.approved += 1;
        else if (item.moderationStatus === "REJECTED") acc.rejected += 1;
        else acc.pending += 1;
        return acc;
      },
      { total: 0, approved: 0, rejected: 0, pending: 0 }
    );

    return {
      streamSummary,
      videoSummary,
      recentStreams,
      recentVideos,
    };
  }

  // ---------- STREAMS ----------

  @Get("events/:id/streams")
  async listEventStreams(@Param("id") eventId: string, @Req() req: any) {
    const userId = this.getUserId(req);
    const role = this.getUserRole(req);

    if (!userId) {
      throw new ForbiddenException("Missing user");
    }

    if (role === "ADMIN") {
      return this.prisma.stream.findMany({
        where: { eventId },
        orderBy: [{ createdAt: "desc" }],
      });
    }

    return this.prisma.stream.findMany({
      where: {
        eventId,
        submittedByUserId: userId,
      },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  @Post("events/:id/streams")
  async submitStream(
    @Param("id") eventId: string,
    @Body() dto: SubmitStreamDto,
    @Req() req: any
  ) {
    const userId = this.getUserId(req);

    if (!userId) {
      throw new ForbiddenException("Missing user");
    }

    if (dto.sourceType === "YOUTUBE" && !dto.youtubeVideoId) {
      return { ok: false, error: "youtubeVideoId is required for YOUTUBE streams" };
    }

    if (
      dto.sourceType === "EXTERNAL_HLS" &&
      !dto.playbackHlsUrl &&
      !dto.playbackDashUrl
    ) {
      return {
        ok: false,
        error: "playbackHlsUrl or playbackDashUrl is required for EXTERNAL_HLS streams",
      };
    }

    if (dto.isPrimary) {
      await this.prisma.stream.updateMany({
        where: {
          eventId,
          submittedByUserId: userId,
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    const created = await this.prisma.stream.create({
      data: {
        eventId,
        submittedByUserId: userId,
        needsReview: false,
        moderationStatus: "APPROVED",
        rejectionReason: null,
        reviewedAt: new Date(),
        reviewedByUserId: userId,
        sourceType: dto.sourceType as any,
        provider: "custom",
        title: dto.title,
        isPrimary: dto.isPrimary ?? false,
        priority: dto.priority ?? 0,
        playbackHlsUrl: dto.playbackHlsUrl,
        playbackDashUrl: dto.playbackDashUrl,
        youtubeVideoId: dto.youtubeVideoId,
        lifecycle: "CREATED",
      },
    });

    return { ok: true, stream: created };
  }

  @Patch("streams/:id")
  async updateSubmittedStream(
    @Param("id") id: string,
    @Body() dto: UpdateSubmittedStreamDto,
    @Req() req: any
  ) {
    const userId = this.getUserId(req);
    const role = this.getUserRole(req);

    if (!userId) {
      throw new ForbiddenException("Missing user");
    }

    const existing = await this.prisma.stream.findUnique({
      where: { id },
      select: {
        id: true,
        eventId: true,
        submittedByUserId: true,
        moderationStatus: true,
      },
    });

    if (!existing) {
      return { ok: false, error: "Stream not found" };
    }

    if (role !== "ADMIN" && existing.submittedByUserId !== userId) {
      throw new ForbiddenException("Not your stream");
    }

    if (dto.isPrimary) {
      await this.prisma.stream.updateMany({
        where: {
          eventId: existing.eventId,
          submittedByUserId: existing.submittedByUserId ?? userId,
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    const updated = await this.prisma.stream.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.isPrimary !== undefined ? { isPrimary: dto.isPrimary } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.playbackHlsUrl !== undefined ? { playbackHlsUrl: dto.playbackHlsUrl } : {}),
        ...(dto.playbackDashUrl !== undefined ? { playbackDashUrl: dto.playbackDashUrl } : {}),
        ...(dto.youtubeVideoId !== undefined ? { youtubeVideoId: dto.youtubeVideoId } : {}),
        needsReview: false,
        moderationStatus: "APPROVED",
        rejectionReason: null,
        reviewedAt: new Date(),
        reviewedByUserId: userId,
      },
    });

    return { ok: true, stream: updated };
  }

  @Delete("streams/:id")
  async deleteSubmittedStream(@Param("id") id: string, @Req() req: any) {
    const userId = this.getUserId(req);
    const role = this.getUserRole(req);

    if (!userId) {
      throw new ForbiddenException("Missing user");
    }

    const existing = await this.prisma.stream.findUnique({
      where: { id },
      select: {
        id: true,
        submittedByUserId: true,
        moderationStatus: true,
      },
    });

    if (!existing) {
      return { ok: false, error: "Stream not found" };
    }

    if (role !== "ADMIN" && existing.submittedByUserId !== userId) {
      throw new ForbiddenException("Not your stream");
    }

    await this.prisma.stream.delete({
      where: { id },
    });

    return { ok: true };
  }

  // ---------- VIDEOS ----------

  @Get("events/:id/videos")
  async listEventVideos(@Param("id") eventId: string, @Req() req: any) {
    const userId = this.getUserId(req);
    const role = this.getUserRole(req);

    if (!userId) {
      throw new ForbiddenException("Missing user");
    }

    if (role === "ADMIN") {
      return this.prisma.video.findMany({
        where: { eventId },
        orderBy: [{ createdAt: "desc" }],
      });
    }

    return this.prisma.video.findMany({
      where: {
        eventId,
        submittedByUserId: userId,
      },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  @Post("events/:id/videos")
  async submitVideo(
    @Param("id") eventId: string,
    @Body() dto: SubmitVideoDto,
    @Req() req: any
  ) {
    const userId = this.getUserId(req);

    if (!userId) {
      throw new ForbiddenException("Missing user");
    }

    if (dto.sourceType === "YOUTUBE" && !dto.youtubeVideoId) {
      return { ok: false, error: "youtubeVideoId is required for YOUTUBE videos" };
    }

    if (
      dto.sourceType === "EXTERNAL_HLS" &&
      !dto.playbackHlsUrl &&
      !dto.playbackDashUrl
    ) {
      return {
        ok: false,
        error: "playbackHlsUrl or playbackDashUrl is required for EXTERNAL_HLS videos",
      };
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      return { ok: false, error: "Event not found" };
    }

    const created = await this.prisma.video.create({
      data: {
        eventId,
        submittedByUserId: userId,
        needsReview: true,
        moderationStatus: "PENDING",
        rejectionReason: null,
        reviewedAt: null,
        reviewedByUserId: null,
        sourceType: dto.sourceType as any,
        provider: dto.sourceType === "YOUTUBE" ? "youtube" : "custom",
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        playbackHlsUrl: dto.playbackHlsUrl || null,
        playbackDashUrl: dto.playbackDashUrl || null,
        youtubeVideoId: dto.youtubeVideoId?.trim() || null,
        durationSeconds: dto.durationSeconds,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
        status: "READY",
      },
    });

    return { ok: true, video: created };
  }

  @Patch("videos/:id")
  async updateSubmittedVideo(
    @Param("id") id: string,
    @Body() dto: UpdateSubmittedVideoDto,
    @Req() req: any
  ) {
    const userId = this.getUserId(req);
    const role = this.getUserRole(req);

    if (!userId) {
      throw new ForbiddenException("Missing user");
    }

    const existing = await this.prisma.video.findUnique({
      where: { id },
      select: {
        id: true,
        submittedByUserId: true,
        moderationStatus: true,
      },
    });

    if (!existing) {
      return { ok: false, error: "Video not found" };
    }

    if (role !== "ADMIN" && existing.submittedByUserId !== userId) {
      throw new ForbiddenException("Not your video");
    }

    if (role !== "ADMIN" && existing.moderationStatus === "APPROVED") {
      throw new ForbiddenException("Cannot edit an approved video");
    }

    const updated = await this.prisma.video.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.youtubeVideoId !== undefined ? { youtubeVideoId: dto.youtubeVideoId?.trim() || null } : {}),
        ...(dto.playbackHlsUrl !== undefined ? { playbackHlsUrl: dto.playbackHlsUrl || null } : {}),
        ...(dto.playbackDashUrl !== undefined ? { playbackDashUrl: dto.playbackDashUrl || null } : {}),
        ...(dto.durationSeconds !== undefined ? { durationSeconds: dto.durationSeconds } : {}),
        ...(dto.publishedAt !== undefined
          ? { publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null }
          : {}),
        needsReview: true,
        moderationStatus: "PENDING",
        rejectionReason: null,
        reviewedAt: null,
        reviewedByUserId: null,
      },
    });

    return { ok: true, video: updated };
  }

  @Delete("videos/:id")
  async deleteSubmittedVideo(@Param("id") id: string, @Req() req: any) {
    const userId = this.getUserId(req);
    const role = this.getUserRole(req);

    if (!userId) {
      throw new ForbiddenException("Missing user");
    }

    const existing = await this.prisma.video.findUnique({
      where: { id },
      select: {
        id: true,
        submittedByUserId: true,
        moderationStatus: true,
      },
    });

    if (!existing) {
      return { ok: false, error: "Video not found" };
    }

    if (role !== "ADMIN" && existing.submittedByUserId !== userId) {
      throw new ForbiddenException("Not your video");
    }

    if (role !== "ADMIN" && existing.moderationStatus === "APPROVED") {
      throw new ForbiddenException("Cannot delete an approved video");
    }

    await this.prisma.video.delete({
      where: { id },
    });

    return { ok: true };
  }
}