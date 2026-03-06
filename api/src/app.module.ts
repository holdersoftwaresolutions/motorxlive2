import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { PublicVideosController } from "./public/public-videos.controller";
import { PublicCategoriesController } from "./public/public-categories.controller";
import { PublicEventsController } from "./public/public-events.controller";
import { AdminController } from "./admin/admin.controller";

@Module({
  imports: [PrismaModule],
  controllers: [
    HealthController,
    PublicVideosController,
    PublicCategoriesController,
    PublicEventsController,
    AdminController,
  ],
})
export class AppModule {}