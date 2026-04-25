import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import axios from "axios";

export type YouTubeAutofillResult = {
  videoId: string;
  title: string;
  description?: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  embeddable?: boolean;
  privacyStatus?: string;
  uploadStatus?: string;
  liveBroadcastContent?: string;
  scheduledStartTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  embedUrl: string;
  watchUrl: string;
};

@Injectable()
export class YouTubeService {
  private readonly apiKey = process.env.YOUTUBE_API_KEY;

  extractVideoId(input: string): string {
    if (!input || typeof input !== "string") {
      throw new BadRequestException("YouTube URL is required.");
    }

    const value = input.trim();

    const patterns = [
      /youtube\.com\/watch\?v=([^&]+)/,
      /youtu\.be\/([^?&]+)/,
      /youtube\.com\/live\/([^?&]+)/,
      /youtube\.com\/embed\/([^?&/]+)/,
      /youtube\.com\/shorts\/([^?&/]+)/,
    ];

    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match?.[1]) return match[1];
    }

    if (/^[a-zA-Z0-9_-]{11}$/.test(value)) {
      return value;
    }

    throw new BadRequestException("Could not extract a valid YouTube video ID.");
  }

  async getVideoMetadata(input: string): Promise<YouTubeAutofillResult> {
    if (!this.apiKey) {
      throw new InternalServerErrorException("YOUTUBE_API_KEY is not configured.");
    }

    const videoId = this.extractVideoId(input);

    const response = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
      params: {
        key: this.apiKey,
        id: videoId,
        part: "snippet,status,liveStreamingDetails",
      },
    });

    const item = response.data?.items?.[0];

    if (!item) {
      throw new BadRequestException("No YouTube video found for that URL.");
    }

    const snippet = item.snippet ?? {};
    const status = item.status ?? {};
    const liveStreamingDetails = item.liveStreamingDetails ?? {};
    const thumbnails = snippet.thumbnails ?? {};

    const thumbnailUrl =
      thumbnails.maxres?.url ||
      thumbnails.standard?.url ||
      thumbnails.high?.url ||
      thumbnails.medium?.url ||
      thumbnails.default?.url;

    return {
      videoId,
      title: snippet.title ?? "",
      description: snippet.description ?? "",
      channelId: snippet.channelId ?? "",
      channelTitle: snippet.channelTitle ?? "",
      thumbnailUrl,
      publishedAt: snippet.publishedAt,
      embeddable: status.embeddable,
      privacyStatus: status.privacyStatus,
      uploadStatus: status.uploadStatus,
      liveBroadcastContent: snippet.liveBroadcastContent,
      scheduledStartTime: liveStreamingDetails.scheduledStartTime,
      actualStartTime: liveStreamingDetails.actualStartTime,
      actualEndTime: liveStreamingDetails.actualEndTime,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  }
}