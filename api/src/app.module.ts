import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { StorageModule } from "./storage/storage.module";
import { PublicVideosController } from "./public/public-videos.controller";
import { PublicCategoriesController } from "./public/public-categories.controller";
import { PublicEventsController } from "./public/public-events.controller";
import { PublicLiveController } from "./public/public-live.controller";
import { PublicEventLiveController } from "./public/public-event-live.controller";
import { AdminController } from "./admin/admin.controller";
import { StreamerController } from "./streamer/streamer.controller";

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [
    HealthController,
    PublicVideosController,
    PublicCategoriesController,
    PublicEventsController,
    PublicLiveController,
    PublicEventLiveController,
    AdminController,
    StreamerController,
  ],
})
export class AppModule {}