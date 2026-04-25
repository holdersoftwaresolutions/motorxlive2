import { Module } from "@nestjs/common";
import { YouTubeService } from "./youtube.service";
import { YouTubeController } from "./youtube.controller";

@Module({
  controllers: [YouTubeController],
  providers: [YouTubeService],
  exports: [YouTubeService],
})
export class YouTubeModule {}