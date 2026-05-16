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
import {
  IsDateString,
  IsOptional,
  IsString,
  IsNumber,
} from "class-validator";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class ContributorCreateEventDto {
  @IsString()
  title!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsString()
  heroImageUrl?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  venueName?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "STREAMER", "MEDIA")
@Controller("contributor/events")
export class ContributorEventsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listMine(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id;

    return this.prisma.event.findMany({
      where: {
        submittedByUserId: userId,
      },
      orderBy: [{ createdAt: "desc" } as any],
      include: {
        category: true,
        streams: true,
        videos: true,
      },
    });
  }

  @Post()
  async createEvent(@Req() req: any, @Body() dto: ContributorCreateEventDto) {
    const userId = req.user?.sub || req.user?.id;

    const existing = await this.prisma.event.findUnique({
      where: {
        slug: dto.slug,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return {
        ok: false,
        error: "An event with this slug already exists. Change the title slightly.",
      };
    }

    const event = await this.prisma.event.create({
      data: {
        submittedByUserId: userId,
        eventSource: "CONTRIBUTOR" as any,
        eventReviewStatus: "NEEDS_REVIEW" as any,

        categoryId: dto.categoryId || null,
        title: dto.title.trim(),
        slug: dto.slug.trim(),
        description: dto.description?.trim() || null,
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        venueName: dto.venueName?.trim() || null,
        addressLine1: dto.addressLine1?.trim() || null,
        city: dto.city?.trim() || null,
        state: dto.state?.trim() || null,
        postalCode: dto.postalCode?.trim() || null,
        country: dto.country?.trim() || null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        heroImageUrl: dto.heroImageUrl?.trim() || null,
      },
      include: {
        category: true,
      },
    });

    return {
      ok: true,
      event,
      message: "Event submitted for admin review.",
    };
  }

  @Patch(":id")
  async updateMine(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: ContributorCreateEventDto
  ) {
    const userId = req.user?.sub || req.user?.id;
    const role = req.user?.role;

    const existing = await this.prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        submittedByUserId: true,
        eventReviewStatus: true,
      },
    });

    if (!existing) {
      return {
        ok: false,
        error: "Event not found.",
      };
    }

    if (role !== "ADMIN" && existing.submittedByUserId !== userId) {
      return {
        ok: false,
        error: "You can only edit events you submitted.",
      };
    }

    if (existing.eventReviewStatus === "PUBLISHED" && role !== "ADMIN") {
      return {
        ok: false,
        error: "Published events can only be edited by an admin.",
      };
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        eventReviewStatus: "NEEDS_REVIEW" as any,
        categoryId: dto.categoryId || null,
        title: dto.title?.trim(),
        slug: dto.slug?.trim(),
        description: dto.description?.trim() || null,
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        venueName: dto.venueName?.trim() || null,
        addressLine1: dto.addressLine1?.trim() || null,
        city: dto.city?.trim() || null,
        state: dto.state?.trim() || null,
        postalCode: dto.postalCode?.trim() || null,
        country: dto.country?.trim() || null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        heroImageUrl: dto.heroImageUrl?.trim() || null,
      },
    });

    return {
      ok: true,
      event: updated,
      message: "Event updated and sent back for review.",
    };
  }
}