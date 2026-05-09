import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { YouTubeDiscoveryService } from "./youtube-discovery.service";
import { AuditService } from "../audit/audit.service";

function envBool(name: string, defaultValue = false) {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return value === "true";
}

@Injectable()
export class YouTubeDiscoveryCron {
  private readonly logger = new Logger(YouTubeDiscoveryCron.name);

  constructor(private readonly discovery: YouTubeDiscoveryService,
              private readonly audit: AuditService,
             ) {}

  // Runs hourly, but only executes during the configured hour.
  // This avoids redeploying just to change the daily execution hour.
  @Cron("0 0 * * * *")
  async runDailyYouTubePipeline() {
    const job = await this.audit.startJob({
        jobName: "YOUTUBE_DAILY_PIPELINE",
    });

    try {
        const monitorResult = await this.discovery.monitorApprovedChannels();

        const ingestResult = await this.discovery.autoIngestApprovedChannels();

        await this.audit.finishJob({
        id: job?.id,
        status: "SUCCESS",
        summary: "Daily YouTube pipeline completed",
        metadata: {
            monitored: monitorResult?.monitoredCount ?? 0,
            attempted: ingestResult?.attempted ?? 0,
            processed: ingestResult?.processed ?? 0,
        },
        });
    } catch (err: any) {
        await this.audit.finishJob({
        id: job?.id,
        status: "FAILED",
        error: err?.message || "Cron failed",
        severity: "ERROR",
        });

        throw err;
    }
    }
}