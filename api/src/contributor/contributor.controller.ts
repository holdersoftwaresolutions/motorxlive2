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
    const recentPast = new Date(now.getTime() - 24 * 60 * 60 * 1000); // last 24 hours

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
        needsReview: true,
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
        needsReview: true,
      },
    });

    if (!existing) {
      return { ok: false, error: "Stream not found" };
    }

    if (role !== "ADMIN" && existing.submittedByUserId !== userId) {
      throw new ForbiddenException("Not your stream");
    }

    if (role !== "ADMIN" && !existing.needsReview) {
      throw new ForbiddenException("Cannot edit a reviewed stream");
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
        needsReview: true,
      },
    });

    if (!existing) {
      return { ok: false, error: "Stream not found" };
    }

    if (role !== "ADMIN" && existing.submittedByUserId !== userId) {
      throw new ForbiddenException("Not your stream");
    }

    if (role !== "ADMIN" && !existing.needsReview) {
      throw new ForbiddenException("Cannot delete a reviewed stream");
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

    const created = await this.prisma.video.create({
      data: {
        eventId,
        submittedByUserId: userId,
        needsReview: true,
        sourceType: dto.sourceType as any,
        provider: "custom",
        title: dto.title,
        description: dto.description,
        playbackHlsUrl: dto.playbackHlsUrl,
        playbackDashUrl: dto.playbackDashUrl,
        youtubeVideoId: dto.youtubeVideoId,
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
        needsReview: true,
      },
    });

    if (!existing) {
      return { ok: false, error: "Video not found" };
    }

    if (role !== "ADMIN" && existing.submittedByUserId !== userId) {
      throw new ForbiddenException("Not your video");
    }

    if (role !== "ADMIN" && !existing.needsReview) {
      throw new ForbiddenException("Cannot edit a reviewed video");
    }

    const updated = await this.prisma.video.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.youtubeVideoId !== undefined ? { youtubeVideoId: dto.youtubeVideoId } : {}),
        ...(dto.playbackHlsUrl !== undefined ? { playbackHlsUrl: dto.playbackHlsUrl } : {}),
        ...(dto.playbackDashUrl !== undefined ? { playbackDashUrl: dto.playbackDashUrl } : {}),
        ...(dto.durationSeconds !== undefined ? { durationSeconds: dto.durationSeconds } : {}),
        ...(dto.publishedAt !== undefined
          ? { publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null }
          : {}),
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
        needsReview: true,
      },
    });

    if (!existing) {
      return { ok: false, error: "Video not found" };
    }

    if (role !== "ADMIN" && existing.submittedByUserId !== userId) {
      throw new ForbiddenException("Not your video");
    }

    if (role !== "ADMIN" && !existing.needsReview) {
      throw new ForbiddenException("Cannot delete a reviewed video");
    }

    await this.prisma.video.delete({
      where: { id },
    });

    return { ok: true };
  }
}