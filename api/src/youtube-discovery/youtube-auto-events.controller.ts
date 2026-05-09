import { Body, Controller, Get, Param, Patch, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { YouTubeDiscoveryService } from "./youtube-discovery.service";
import { AuditService } from "../audit/audit.service";
import { Throttle } from "@nestjs/throttler";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Throttle({ default: { limit: 30, ttl: 60000 } })
@Controller("admin/youtube-auto-events")
export class YouTubeAutoEventsController {
  constructor(
    private readonly discovery: YouTubeDiscoveryService,
    private readonly audit: AuditService
  ) {}

  @Get()
  listAutoEvents() {
    return this.discovery.listAutoCreatedEvents();
  }

  @Patch(":id/approve")
  async approve(@Param("id") id: string, @Req() req: any) {
    const result = await this.discovery.approveAutoCreatedEvent(id);

    await this.audit.audit({
      action: "AUTO_EVENT_APPROVED",
      resource: "EVENT",
      resourceId: id,
      actorType: "ADMIN",
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      ipAddress: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
      metadata: { result },
    });

    return result;
  }

  @Patch(":id/archive")
  async archive(@Param("id") id: string, @Req() req: any) {
    const result = await this.discovery.archiveAutoCreatedEvent(id);

    await this.audit.audit({
      action: "AUTO_EVENT_ARCHIVED",
      resource: "EVENT",
      resourceId: id,
      actorType: "ADMIN",
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      ipAddress: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
      metadata: { result },
    });

    return result;
  }

  @Patch(":id/merge")
  async merge(
    @Param("id") id: string,
    @Body() body: { targetEventId: string },
    @Req() req: any
  ) {
    const result = await this.discovery.mergeAutoCreatedEvent(id, body.targetEventId);

    await this.audit.audit({
      action: "AUTO_EVENT_MERGED",
      resource: "EVENT",
      resourceId: id,
      actorType: "ADMIN",
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      ipAddress: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
      metadata: {
        targetEventId: body.targetEventId,
        result,
      },
    });

    return result;
  }
}