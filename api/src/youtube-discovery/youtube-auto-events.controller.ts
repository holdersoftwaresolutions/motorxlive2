import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { YouTubeDiscoveryService } from "./youtube-discovery.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/youtube-auto-events")
export class YouTubeAutoEventsController {
  constructor(private readonly discovery: YouTubeDiscoveryService) {}

  @Get()
  listAutoEvents() {
    return this.discovery.listAutoCreatedEvents();
  }

  @Patch(":id/approve")
  approve(@Param("id") id: string) {
    return this.discovery.approveAutoCreatedEvent(id);
  }

  @Patch(":id/archive")
  archive(@Param("id") id: string) {
    return this.discovery.archiveAutoCreatedEvent(id);
  }

  @Patch(":id/merge")
  merge(@Param("id") id: string, @Body() body: { targetEventId: string }) {
    return this.discovery.mergeAutoCreatedEvent(id, body.targetEventId);
  }
}