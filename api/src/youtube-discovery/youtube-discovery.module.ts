import { Module } from "@nestjs/common";
import { YouTubeDiscoveryController } from "./youtube-discovery.controller";
import { YouTubeDiscoveryService } from "./youtube-discovery.service";
import { YouTubeDiscoveryCron } from "./youtube-discovery.cron";
import { YouTubeClient } from "./youtube-client";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { YouTubeAutoEventsController } from "./youtube-auto-events.controller";

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule],
  controllers: [YouTubeDiscoveryController, YouTubeAutoEventsController],
  providers: [YouTubeDiscoveryService, YouTubeDiscoveryCron, YouTubeClient],
  exports: [YouTubeDiscoveryService],
})
export class YouTubeDiscoveryModule {}