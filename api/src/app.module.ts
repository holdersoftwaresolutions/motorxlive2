import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { PublicVideosController } from "./public/public-videos.controller";
import { PrismaService } from "./prisma/prisma.service";

@Module({
  controllers: [HealthController, PublicVideosController],
  providers: [PrismaService],
})
export class AppModule {}
