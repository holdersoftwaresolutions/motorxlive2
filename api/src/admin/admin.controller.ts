import { hash } from "bcryptjs";
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateCategoryDto,
  CreateEventDto,
  UpdateCategoryDto,
  UpdateEventDto,
  CreateContributorDto,
} from "./admin.dto";
import { CreateStreamDto, UpdateStreamDto } from "./admin-streams.dto";
import { RejectSubmissionDto } from "./admin-review.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

function extractYouTubeVideoId(input?: string | null): string | null {
  if (!input) return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);

    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace("/", "").trim();
      return id || null;
    }

    if (url.hostname.includes("youtube.com")) {
      const fromQuery = url.searchParams.get("v");
      if (fromQuery) return fromQuery;

      const liveMatch = url.pathname.match(/\/live\/([^/?]+)/);
      if (liveMatch?.[1]) return liveMatch[1];

      const embedMatch = url.pathname.match(/\/embed\/([^/?]+)/);
      if (embedMatch?.[1]) return embedMatch[1];
    }
  } catch {
    // not a valid URL, fall through
  }

  return trimmed || null;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin")
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- USERS ----------

  @Get("users")
  async listUsers() {
    return this.prisma.user.findMany({
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  @Post("users")
  async createContributor(@Body() dto: CreateContributorDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      return { ok: false, error: "A user with that email already exists." };
    }

    const passwordHash = await hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name?.trim() || null,
        passwordHash,
        role: dto.role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return { ok: true, user };
  }

  // ---------- CATEGORIES ----------

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
  async updateCategory(@Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  // ---------- EVENTS ----------

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
        categoryId: dto.categoryId,
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        venueName: dto.venueName,
        addressLine1: dto.addressLine1,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
        latitude: dto.latitude,
        longitude: dto.longitude,
        heroImageUrl: dto.heroImageUrl,
      },
    });
  }

  @Patch("events/:id")
  async updateEvent(@Param("id") id: string, @Body() dto: UpdateEventDto) {
    return this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.startAt !== undefined
          ? { startAt: dto.startAt ? new Date(dto.startAt) : null }
          : {}),
        ...(dto.endAt !== undefined
          ? { endAt: dto.endAt ? new Date(dto.endAt) : null }
          : {}),
        ...(dto.venueName !== undefined ? { venueName: dto.venueName } : {}),
        ...(dto.addressLine1 !== undefined ? { addressLine1: dto.addressLine1 } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.state !== undefined ? { state: dto.state } : {}),
        ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode } : {}),
        ...(dto.country !== undefined ? { country: dto.country } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.heroImageUrl !== undefined ? { heroImageUrl: dto.heroImageUrl } : {}),
      },
    });
  }

  // ---------- STREAMS ----------

  @Get("streams")
  async listStreams() {
    return this.prisma.stream.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        submittedBy: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });
  }

  @Post("events/:id/streams")
  async createStream(@Param("id") eventId: string, @Body() dto: CreateStreamDto) {
    const youtubeVideoId =
      dto.sourceType === "YOUTUBE"
        ? extractYouTubeVideoId(dto.youtubeVideoId || dto.youtubeUrl)
        : null;

    if (dto.sourceType === "YOUTUBE" && !youtubeVideoId) {
      return { ok: false, error: "A valid YouTube URL or video ID is required for YOUTUBE streams" };
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

    return this.prisma.stream.create({
      data: {
        eventId,
        needsReview: false,
        moderationStatus: "APPROVED",
        rejectionReason: null,
        reviewedAt: new Date(),
        sourceType: dto.sourceType as any,
        provider: dto.sourceType === "YOUTUBE" ? "youtube" : dto.provider || "custom",
        title: dto.title?.trim() || "Live Feed",
        isPrimary: dto.isPrimary ?? false,
        priority: dto.priority ?? 0,
        playbackHlsUrl: dto.playbackHlsUrl || null,
        playbackDashUrl: dto.playbackDashUrl || null,
        youtubeVideoId,
        lifecycle: (dto.lifecycle as any) || "READY",
      },
    });
  }

  @Patch("streams/:id")
  async updateStream(@Param("id") id: string, @Body() dto: UpdateStreamDto) {
    const resolvedYoutubeVideoId =
      dto.youtubeVideoId !== undefined || dto.youtubeUrl !== undefined
        ? extractYouTubeVideoId(dto.youtubeVideoId || dto.youtubeUrl)
        : undefined;

    return this.prisma.stream.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title?.trim() || "Live Feed" } : {}),
        ...(dto.isPrimary !== undefined ? { isPrimary: dto.isPrimary } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.playbackHlsUrl !== undefined ? { playbackHlsUrl: dto.playbackHlsUrl || null } : {}),
        ...(dto.playbackDashUrl !== undefined ? { playbackDashUrl: dto.playbackDashUrl || null } : {}),
        ...(resolvedYoutubeVideoId !== undefined ? { youtubeVideoId: resolvedYoutubeVideoId || null } : {}),
        ...(dto.lifecycle !== undefined ? { lifecycle: dto.lifecycle as any } : {}),
      },
    });
  }

  @Get("streams/review-queue")
  async getStreamReviewQueue() {
    return this.prisma.stream.findMany({
      where: {
        moderationStatus: "PENDING",
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

  // ---------- VIDEOS ----------

  @Get("videos")
  async listVideos() {
    return this.prisma.video.findMany({
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: {
        event: true,
      },
    });
  }

  @Post("events/:id/videos")
  async createVideo(@Param("id") eventId: string, @Body() dto: any) {
    const youtubeVideoId =
      dto.sourceType === "YOUTUBE"
        ? extractYouTubeVideoId(dto.youtubeVideoId || dto.youtubeUrl)
        : null;

    if (dto.sourceType === "YOUTUBE" && !youtubeVideoId) {
      return { ok: false, error: "A valid YouTube URL or video ID is required for YOUTUBE videos" };
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

    return this.prisma.video.create({
      data: {
        eventId,
        needsReview: false,
        moderationStatus: "APPROVED",
        rejectionReason: null,
        reviewedAt: new Date(),
        sourceType: dto.sourceType as any,
        provider: dto.sourceType === "YOUTUBE" ? "youtube" : dto.provider || "custom",
        title: dto.title?.trim() || "Untitled Video",
        description: dto.description?.trim() || null,
        playbackHlsUrl: dto.playbackHlsUrl || null,
        playbackDashUrl: dto.playbackDashUrl || null,
        youtubeVideoId,
        durationSeconds: dto.durationSeconds,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
        status: dto.status || "READY",
      },
    });
  }

  @Patch("videos/:id")
  async updateVideo(@Param("id") id: string, @Body() dto: any) {
    const resolvedYoutubeVideoId =
      dto.youtubeVideoId !== undefined || dto.youtubeUrl !== undefined
        ? extractYouTubeVideoId(dto.youtubeVideoId || dto.youtubeUrl)
        : undefined;

    return this.prisma.video.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title?.trim() || "Untitled Video" } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.playbackHlsUrl !== undefined ? { playbackHlsUrl: dto.playbackHlsUrl || null } : {}),
        ...(dto.playbackDashUrl !== undefined ? { playbackDashUrl: dto.playbackDashUrl || null } : {}),
        ...(resolvedYoutubeVideoId !== undefined ? { youtubeVideoId: resolvedYoutubeVideoId || null } : {}),
        ...(dto.durationSeconds !== undefined ? { durationSeconds: dto.durationSeconds } : {}),
        ...(dto.publishedAt !== undefined
          ? { publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  @Get("videos/review-queue")
  async getVideoReviewQueue() {
    return this.prisma.video.findMany({
      where: {
        moderationStatus: "PENDING",
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
}