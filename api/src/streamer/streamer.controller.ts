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
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SubmitStreamDto, UpdateSubmittedStreamDto } from "./streamer-streams.dto";

@Controller("streamer")
export class StreamerController {
  constructor(private readonly prisma: PrismaService) {}

  private getUserId(req: any): string | null {
    return req?.user?.id ?? req?.headers?.["x-dev-user-id"] ?? null;
  }

  private getUserRole(req: any): string | null {
    return req?.user?.role ?? req?.headers?.["x-dev-user-role"] ?? null;
  }

  @Get("events/:id/streams")
  async listEventStreams(@Param("id") eventId: string, @Req() req: any) {
    const userId = this.getUserId(req);
    const role = this.getUserRole(req);

    if (!userId) {
      throw new ForbiddenException("Missing user");
    }

    // For now:
    // - ADMIN can view all
    // - STREAMER can view only their own submissions for that event
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
      return { ok: false, error: "playbackHlsUrl or playbackDashUrl is required for EXTERNAL_HLS streams" };
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
        lifecycle: true,
      },
    });

    if (!existing) {
      return { ok: false, error: "Stream not found" };
    }

    if (existing.submittedByUserId !== userId) {
      throw new ForbiddenException("Not your stream");
    }

    if (!existing.needsReview) {
      throw new ForbiddenException("Cannot edit a reviewed stream");
    }

    if (dto.isPrimary) {
      await this.prisma.stream.updateMany({
        where: {
          eventId: existing.eventId,
          submittedByUserId: userId,
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

    if (existing.submittedByUserId !== userId) {
      throw new ForbiddenException("Not your stream");
    }

    if (!existing.needsReview) {
      throw new ForbiddenException("Cannot delete a reviewed stream");
    }

    await this.prisma.stream.delete({
      where: { id },
    });

    return { ok: true };
  }
}