import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CreateStreamDto, UpdateStreamDto } from "./admin-streams.dto";
import { PrismaService } from "../prisma/prisma.service";
import { UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { RejectSubmissionDto } from "./admin-review.dto";
import { Req } from "@nestjs/common";
import {
  CreateCategoryDto,
  CreateEventDto,
  UpdateCategoryDto,
  UpdateEventDto,
} from "./admin.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin")
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  // -----------------------------
  // Categories
  // -----------------------------

  @Get("categories")
  async listCategories() {
    return this.prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  @Post("categories")
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  @Patch("categories/:id")
  async updateCategory(
    @Param("id") id: string,
    @Body() dto: UpdateCategoryDto
  ) {
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  // -----------------------------
  // Events
  // -----------------------------

  @Get("events")
  async listEvents() {
    return this.prisma.event.findMany({
      orderBy: [{ startAt: "asc" }, { title: "asc" }],
      include: {
        category: true,
      },
    });
  }

  @Get("events/:id")
  async getEvent(@Param("id") id: string) {
    return this.prisma.event.findUnique({
      where: { id },
      include: {
        category: true,
        videos: true,
      },
    });
  }

  @Post("events")
  async createEvent(@Body() dto: CreateEventDto) {
    return this.prisma.event.create({
        data: {
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        heroImageUrl: dto.heroImageUrl,

        venueName: dto.venueName,
        addressLine1: dto.addressLine1,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
        latitude: dto.latitude,
        longitude: dto.longitude,

        categoryId: dto.categoryId,
      },
      include: {
        category: true,
      },
    });
  }

  @Patch("events/:id")
  async updateEvent(@Param("id") id: string, @Body() dto: UpdateEventDto) {
    return this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.startAt !== undefined ? { startAt: dto.startAt ? new Date(dto.startAt) : null } : {}),
        ...(dto.endAt !== undefined ? { endAt: dto.endAt ? new Date(dto.endAt) : null } : {}),
        ...(dto.heroImageUrl !== undefined ? { heroImageUrl: dto.heroImageUrl } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.venueName !== undefined ? { venueName: dto.venueName } : {}),
        ...(dto.addressLine1 !== undefined ? { addressLine1: dto.addressLine1 } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.state !== undefined ? { state: dto.state } : {}),
        ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode } : {}),
        ...(dto.country !== undefined ? { country: dto.country } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
      },
      include: {
        category: true,
      },
    });
  }

    // -----------------------------
  // Streams and videos
  // -----------------------------
  @Post("videos/:id/reject")
  async rejectVideo(
    @Param("id") id: string,
    @Body() dto: RejectSubmissionDto,
    @Req() req: any
  ) {
    const reviewedByUserId = req?.user?.sub ?? null;

    const updated = await this.prisma.video.update({
      where: { id },
      data: {
        needsReview: false,
        moderationStatus: "REJECTED",
        rejectionReason: dto.reason || "Rejected by admin",
        reviewedAt: new Date(),
        reviewedByUserId,
        status: "DISABLED",
      },
    });

    return { ok: true, video: updated };
  }

  @Post("videos/:id/approve")
  async approveVideo(@Param("id") id: string, @Req() req: any) {
    const reviewedByUserId = req?.user?.sub ?? null;

    const updated = await this.prisma.video.update({
      where: { id },
      data: {
        needsReview: false,
        moderationStatus: "APPROVED",
        rejectionReason: null,
        reviewedAt: new Date(),
        reviewedByUserId,
        status: "READY",
      },
    });

    return { ok: true, video: updated };
  }


    @Get("streams/review-queue")
  async listStreamsForReview() {
    return this.prisma.stream.findMany({
      where: {
        needsReview: true,
      },
      orderBy: [{ createdAt: "asc" }],
      include: {
        event: {
          include: {
            category: true,
          },
        },
        submittedBy: true,
      },
    });
  }

  @Post("streams/:id/approve")
  async approveStream(@Param("id") id: string, @Req() req: any) {
    const reviewedByUserId = req?.user?.sub ?? null;

    const updated = await this.prisma.stream.update({
      where: { id },
      data: {
        needsReview: false,
        moderationStatus: "APPROVED",
        rejectionReason: null,
        reviewedAt: new Date(),
        reviewedByUserId,
        lifecycle: "READY",
      },
    });

    return { ok: true, stream: updated };
  }

   @Post("streams/:id/reject")
  async rejectStream(
    @Param("id") id: string,
    @Body() dto: RejectSubmissionDto,
    @Req() req: any
  ) {
    const reviewedByUserId = req?.user?.sub ?? null;

    const updated = await this.prisma.stream.update({
      where: { id },
      data: {
        needsReview: false,
        moderationStatus: "REJECTED",
        rejectionReason: dto.reason || "Rejected by admin",
        reviewedAt: new Date(),
        reviewedByUserId,
        lifecycle: "DISABLED",
      },
    });

    return { ok: true, stream: updated };
  }

  @Get("events/:id/streams")
  async listEventStreams(@Param("id") eventId: string) {
    return this.prisma.stream.findMany({
      where: { eventId },
      orderBy: [{ isPrimary: "desc" }, { priority: "asc" }, { createdAt: "asc" }],
    });
  }

  @Post("events/:id/streams")
  async createStream(
    @Param("id") eventId: string,
    @Body() dto: CreateStreamDto
  ) {
    if (
      dto.sourceType === "YOUTUBE" &&
      !dto.youtubeVideoId
    ) {
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
        where: { eventId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.stream.create({
      data: {
        eventId,
        sourceType: dto.sourceType as any,
        provider: dto.provider ?? "custom",
        title: dto.title,
        isPrimary: dto.isPrimary ?? false,
        priority: dto.priority ?? 0,
        playbackHlsUrl: dto.playbackHlsUrl,
        playbackDashUrl: dto.playbackDashUrl,
        youtubeVideoId: dto.youtubeVideoId,
        lifecycle: (dto.lifecycle as any) ?? "CREATED",
      },
    });
  }

  @Patch("streams/:id")
  async updateStream(
    @Param("id") id: string,
    @Body() dto: UpdateStreamDto
  ) {
    const existing = await this.prisma.stream.findUnique({
      where: { id },
      select: { id: true, eventId: true },
    });

    if (!existing) {
      return { ok: false, error: "Stream not found" };
    }

    if (dto.isPrimary) {
      await this.prisma.stream.updateMany({
        where: { eventId: existing.eventId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.stream.update({
      where: { id },
      data: {
        ...(dto.sourceType !== undefined ? { sourceType: dto.sourceType as any } : {}),
        ...(dto.provider !== undefined ? { provider: dto.provider } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.isPrimary !== undefined ? { isPrimary: dto.isPrimary } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.playbackHlsUrl !== undefined ? { playbackHlsUrl: dto.playbackHlsUrl } : {}),
        ...(dto.playbackDashUrl !== undefined ? { playbackDashUrl: dto.playbackDashUrl } : {}),
        ...(dto.youtubeVideoId !== undefined ? { youtubeVideoId: dto.youtubeVideoId } : {}),
        ...(dto.lifecycle !== undefined ? { lifecycle: dto.lifecycle as any } : {}),
      },
    });
  }
}
