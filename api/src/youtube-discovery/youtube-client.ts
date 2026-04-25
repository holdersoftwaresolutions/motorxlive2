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

  private chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];

    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }

    return chunks;
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

    const cleanIds = Array.from(
      new Set(
        videoIds
          .map((id) => String(id || "").trim())
          .filter((id) => id.length > 0)
      )
    );

    if (!cleanIds.length) {
      return { items: [] };
    }

    const allItems: any[] = [];

    for (const batch of this.chunk(cleanIds, 50)) {
      const url = new URL(`${this.baseUrl}/videos`);
      url.searchParams.set("key", this.apiKey!);
      url.searchParams.set(
        "part",
        "snippet,status,statistics,contentDetails,liveStreamingDetails"
      );
      url.searchParams.set("id", batch.join(","));

      const res = await fetch(url.toString());
      const json = await res.json();

      if (!res.ok) {
        throw new Error(JSON.stringify(json));
      }

      allItems.push(...(json.items || []));
    }

    return { items: allItems };
  }

  async getChannels(channelIds: string[]) {
    this.requireApiKey();

    const cleanIds = Array.from(
      new Set(
        channelIds
          .map((id) => String(id || "").trim())
          .filter((id) => id.length > 0)
      )
    );

    if (!cleanIds.length) {
      return { items: [] };
    }

    const allItems: any[] = [];

    for (const batch of this.chunk(cleanIds, 50)) {
      const url = new URL(`${this.baseUrl}/channels`);
      url.searchParams.set("key", this.apiKey!);
      url.searchParams.set("part", "snippet,statistics,contentDetails");
      url.searchParams.set("id", batch.join(","));

      const res = await fetch(url.toString());
      const json = await res.json();

      if (!res.ok) {
        throw new Error(JSON.stringify(json));
      }

      allItems.push(...(json.items || []));
    }

    return { items: allItems };
  }

  async getRecentUploads(uploadsPlaylistId: string, maxResults = 10) {
    this.requireApiKey();

    const cleanPlaylistId = String(uploadsPlaylistId || "").trim();

    if (!cleanPlaylistId) {
      return { items: [] };
    }

    const url = new URL(`${this.baseUrl}/playlistItems`);
    url.searchParams.set("key", this.apiKey!);
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("playlistId", cleanPlaylistId);
    url.searchParams.set("maxResults", String(maxResults));

    const res = await fetch(url.toString());
    const json = await res.json();

    if (!res.ok) {
      throw new Error(JSON.stringify(json));
    }

    return json;
  }
}