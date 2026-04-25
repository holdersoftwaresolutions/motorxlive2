import { Module } from "@nestjs/common";
import { YouTubeDiscoveryController } from "./youtube-discovery.controller";
import { YouTubeDiscoveryService } from "./youtube-discovery.service";
import { YouTubeClient } from "./youtube-client";

@Module({
  controllers: [YouTubeDiscoveryController],
  providers: [YouTubeDiscoveryService, YouTubeClient],
  exports: [YouTubeDiscoveryService],
})
export class YouTubeDiscoveryModule {}