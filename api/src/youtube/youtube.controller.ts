import { Body, Controller, Post } from "@nestjs/common";
import { YouTubeService } from "./youtube.service";
import { YouTubeAutofillDto } from "./youtube-autofill.dto";

@Controller("youtube")
export class YouTubeController {
  constructor(private readonly youtubeService: YouTubeService) {}

  @Post("autofill")
  async autofill(@Body() dto: YouTubeAutofillDto) {
    return this.youtubeService.getVideoMetadata(dto.url);
  }
}