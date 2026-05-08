import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { YouTubeDiscoveryService } from "./youtube-discovery.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { Throttle } from "@nestjs/throttler";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller("admin/youtube-discovery")
export class YouTubeDiscoveryController {
  constructor(private readonly discovery: YouTubeDiscoveryService) {}

  @Get("channels")
  listChannels() {
    return this.discovery.listDiscoveredChannels();
  }

  @Get("approved-channels")
  listApprovedChannels() {
    return this.discovery.listApprovedChannels();
  }

  @Get("videos")
  listDiscoveredVideos() {
    return this.discovery.listDiscoveredVideos();
  }

  @Post("discover")
  discover(@Body() body: { terms?: string[]; maxResultsPerSearch?: number }) {
    return this.discovery.discoverChannels({
      terms: body?.terms,
      maxResultsPerSearch: body?.maxResultsPerSearch,
    });
  }

  @Patch("channels/:id/approve")
  approve(@Param("id") id: string) {
    return this.discovery.approveChannel(id);
  }

  @Patch("channels/:id/ignore")
  ignore(@Param("id") id: string) {
    return this.discovery.ignoreChannel(id);
  }

  @Patch("channels/:id/settings")
  updateSettings(
    @Param("id") id: string,
    @Body()
    body: {
      category?: any;
      autoIngestStreams?: boolean;
      autoIngestVideos?: boolean;
      autoIngestPodcasts?: boolean;
      isFeatured?: boolean;
      priority?: number;
      isTrusted?: boolean;
      trustLevel?: "REVIEW_REQUIRED" | "AUTO_INGEST_REVIEW" | "AUTO_PUBLISH";
    }
  ) {
    return this.discovery.updateApprovedChannelSettings(id, body);
  }

  @Post("channels/:id/monitor")
  monitorChannel(@Param("id") id: string) {
    return this.discovery.monitorChannel(id);
  }

  @Post("monitor-approved")
  monitorApprovedChannels() {
    return this.discovery.monitorApprovedChannels();
  }

  @Post("videos/:id/ingest")
  ingestVideo(@Param("id") id: string, @Body() body: { eventId?: string }) {
    return this.discovery.ingestDiscoveredVideo(id, {
      eventId: body?.eventId,
    });
  }

  @Post("channels/:id/ingest-ready")
  ingestReadyForChannel(
    @Param("id") id: string,
    @Body() body: { eventId?: string }
  ) {
    return this.discovery.ingestReadyVideosForChannel(id, {
      eventId: body?.eventId,
    });
  }

  @Post("auto-ingest")
  autoIngest(@Body() body: { eventId?: string }) {
    return this.discovery.autoIngestApprovedChannels({
      eventId: body?.eventId,
    });
  }
}