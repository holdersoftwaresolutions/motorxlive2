import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { YouTubeDiscoveryService } from "./youtube-discovery.service";

function envBool(name: string, defaultValue = false) {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return value === "true";
}

@Injectable()
export class YouTubeDiscoveryCron {
  private readonly logger = new Logger(YouTubeDiscoveryCron.name);

  constructor(private readonly discovery: YouTubeDiscoveryService) {}

  // Runs hourly, but only executes during the configured hour.
  // This avoids redeploying just to change the daily execution hour.
  @Cron("0 0 * * * *")
  async runDailyYouTubePipeline() {
    const cronEnabled = envBool("YOUTUBE_DISCOVERY_CRON_ENABLED", false);
    const dailyMonitorEnabled = envBool("YOUTUBE_DAILY_MONITOR_ENABLED", true);

    if (!cronEnabled || !dailyMonitorEnabled) {
      return;
    }

    const configuredHour = Number(process.env.YOUTUBE_DAILY_MONITOR_HOUR || 8);
    const currentHourUtc = new Date().getUTCHours();

    if (currentHourUtc !== configuredHour) {
      return;
    }

    this.logger.log("YOUTUBE_DAILY_PIPELINE_START");

    try {
      const monitorResult = await this.discovery.monitorApprovedChannels();
      this.logger.log(
        `YOUTUBE_MONITOR_COMPLETE channels=${monitorResult?.monitoredCount ?? 0}`
      );

      const ingestResult = await this.discovery.autoIngestApprovedChannels();
      this.logger.log(
        `YOUTUBE_AUTO_INGEST_COMPLETE attempted=${
          ingestResult?.attempted ?? 0
        } processed=${ingestResult?.processed ?? 0}`
      );

      this.logger.log("YOUTUBE_DAILY_PIPELINE_COMPLETE");
    } catch (err: any) {
      this.logger.error(
        `YOUTUBE_DAILY_PIPELINE_FAILED message=${err?.message || err}`,
        err?.stack || ""
      );
    }
  }
}