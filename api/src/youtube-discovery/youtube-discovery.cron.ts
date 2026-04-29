import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { YouTubeDiscoveryService } from "./youtube-discovery.service";

@Injectable()
export class YouTubeDiscoveryCron {
  private readonly logger = new Logger(YouTubeDiscoveryCron.name);

  constructor(private readonly discovery: YouTubeDiscoveryService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async runYouTubePipeline() {
    if (process.env.YOUTUBE_DISCOVERY_CRON_ENABLED !== "true") {
      return;
    }

    this.logger.log("Starting YouTube approved-channel monitor + auto-ingest pipeline");

    try {
      const monitorResult = await this.discovery.monitorApprovedChannels();
      this.logger.log(
        `YouTube monitor complete. Monitored ${monitorResult?.monitoredCount ?? 0} channels.`
      );

      const ingestResult = await this.discovery.autoIngestApprovedChannels();
      this.logger.log(
        `YouTube auto-ingest complete. Processed ${
          ingestResult?.processed ?? ingestResult?.attempted ?? 0
        } items.`
      );
    } catch (err: any) {
      this.logger.error(
        `YouTube pipeline failed: ${err?.message || err}`,
        err?.stack || ""
      );
    }
  }
}