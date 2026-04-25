import { Injectable } from "@nestjs/common";

@Injectable()
export class YouTubeClient {
  private readonly apiKey = process.env.YOUTUBE_API_KEY;
  private readonly baseUrl = "https://www.googleapis.com/youtube/v3";

  private requireApiKey() {
    if (!this.apiKey) {
      throw new Error("YOUTUBE_API_KEY is not configured");
    }
  }

  async searchVideos(params: {
    query: string;
    eventType?: "live" | "upcoming" | "completed";
    maxResults?: number;
  }) {
    this.requireApiKey();

    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.set("key", this.apiKey!);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("videoEmbeddable", "true");
    url.searchParams.set("q", params.query);
    url.searchParams.set("maxResults", String(params.maxResults ?? 10));

    if (params.eventType) {
      url.searchParams.set("eventType", params.eventType);
    }

    const res = await fetch(url.toString());
    const json = await res.json();

    if (!res.ok) {
      throw new Error(JSON.stringify(json));
    }

    return json;
  }

  async getVideos(videoIds: string[]) {
    this.requireApiKey();
    if (!videoIds.length) return { items: [] };

    const url = new URL(`${this.baseUrl}/videos`);
    url.searchParams.set("key", this.apiKey!);
    url.searchParams.set(
      "part",
      "snippet,status,statistics,contentDetails,liveStreamingDetails"
    );
    url.searchParams.set("id", videoIds.join(","));

    const res = await fetch(url.toString());
    const json = await res.json();

    if (!res.ok) {
      throw new Error(JSON.stringify(json));
    }

    return json;
  }

  async getChannels(channelIds: string[]) {
    this.requireApiKey();
    if (!channelIds.length) return { items: [] };

    const url = new URL(`${this.baseUrl}/channels`);
    url.searchParams.set("key", this.apiKey!);
    url.searchParams.set("part", "snippet,statistics,contentDetails");
    url.searchParams.set("id", channelIds.join(","));

    const res = await fetch(url.toString());
    const json = await res.json();

    if (!res.ok) {
      throw new Error(JSON.stringify(json));
    }

    return json;
  }

  async getRecentUploads(uploadsPlaylistId: string, maxResults = 10) {
    this.requireApiKey();

    const url = new URL(`${this.baseUrl}/playlistItems`);
    url.searchParams.set("key", this.apiKey!);
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("playlistId", uploadsPlaylistId);
    url.searchParams.set("maxResults", String(maxResults));

    const res = await fetch(url.toString());
    const json = await res.json();

    if (!res.ok) {
      throw new Error(JSON.stringify(json));
    }

    return json;
  }
}