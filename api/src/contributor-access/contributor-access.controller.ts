import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ContributorAccessService } from "./contributor-access.service";
import {
  CreateContributorAccessRequestDto,
  ReviewContributorAccessRequestDto,
} from "./contributor-access.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

function requestMeta(req: any) {
  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null;

  return {
    ipAddress: Array.isArray(ip) ? ip[0] : ip,
    userAgent: req.headers["user-agent"] || null,
  };
}

@Controller()
export class ContributorAccessController {
  constructor(private readonly service: ContributorAccessService) {}

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post("public/contributor-access-requests")
  async createPublicRequest(
    @Body() dto: CreateContributorAccessRequestDto,
    @Req() req: any
  ) {
    return this.service.createPublicRequest(dto, requestMeta(req));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get("admin/contributor-access-requests")
  async listAdminRequests(@Query("status") status?: string) {
    return this.service.listAdminRequests(status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Patch("admin/contributor-access-requests/:id/approve")
  async approve(
    @Param("id") id: string,
    @Body() dto: ReviewContributorAccessRequestDto,
    @Req() req: any
  ) {
    return this.service.approveRequest(id, dto, req.user, requestMeta(req));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Patch("admin/contributor-access-requests/:id/reject")
  async reject(
    @Param("id") id: string,
    @Body() dto: ReviewContributorAccessRequestDto,
    @Req() req: any
  ) {
    return this.service.rejectRequest(id, dto, req.user, requestMeta(req));
  }
}