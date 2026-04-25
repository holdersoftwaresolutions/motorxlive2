import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { StorageModule } from "./storage/storage.module";
import { GeocodingModule } from "./geocoding/geocoding.module";
import { MapboxLocationModule } from "./geocoding/mapbox-location.module";
import { AuthModule } from "./auth/auth.module";
import { AuthController } from "./auth/auth.controller";

import { PublicVideosController } from "./public/public-videos.controller";
import { PublicCategoriesController } from "./public/public-categories.controller";
import { PublicEventsController } from "./public/public-events.controller";
import { PublicLiveController } from "./public/public-live.controller";
import { PublicEventLiveController } from "./public/public-event-live.controller";
import { PublicGeocodeController } from "./public/public-geocode.controller";
import { PublicLocationController } from "./public/public-location.controller";

import { AdminController } from "./admin/admin.controller";
import { ContributorController } from "./contributor/contributor.controller";

import { YouTubeModule } from "./youtube/youtube.module";
import { YouTubeController } from "./youtube/youtube.controller";

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    GeocodingModule,
    MapboxLocationModule,
    AuthModule,
    YouTubeModule,
  ],
  controllers: [
    HealthController,
    AuthController,
    PublicVideosController,
    PublicCategoriesController,
    PublicEventsController,
    PublicLiveController,
    PublicEventLiveController,
    PublicGeocodeController,
    PublicLocationController,
    AdminController,
    ContributorController,
    YouTubeController,
  ],
})
export class AppModule {}