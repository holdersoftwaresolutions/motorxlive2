import { Module } from "@nestjs/common";
import { YouTubeDiscoveryController } from "./youtube-discovery.controller";
import { YouTubeDiscoveryService } from "./youtube-discovery.service";
import { YouTubeClient } from "./youtube-client";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [YouTubeDiscoveryController],
  providers: [YouTubeDiscoveryService, YouTubeClient],
  exports: [YouTubeDiscoveryService],
})
export class YouTubeDiscoveryModule {}