import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type AuditSeverity = "INFO" | "WARN" | "ERROR" | "CRITICAL";
type AuditActorType = "SYSTEM" | "USER" | "ADMIN" | "CONTRIBUTOR" | "ANONYMOUS";

type AuditInput = {
  action: string;
  resource?: string;
  resourceId?: string;
  actorType?: AuditActorType;
  actorId?: string;
  actorEmail?: string;
  severity?: AuditSeverity;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
};

type SecurityInput = {
  eventType: string;
  severity?: AuditSeverity;
  actorId?: string;
  actorEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  message?: string;
  metadata?: any;
};

type JobStartInput = {
  jobName: string;
  metadata?: any;
};

type JobFinishInput = {
  id: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  summary?: string;
  metadata?: any;
  error?: string;
  severity?: AuditSeverity;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async audit(input: AuditInput) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          action: input.action,
          resource: input.resource || null,
          resourceId: input.resourceId || null,
          actorType: (input.actorType || "SYSTEM") as any,
          actorId: input.actorId || null,
          actorEmail: input.actorEmail || null,
          severity: (input.severity || "INFO") as any,
          ipAddress: input.ipAddress || null,
          userAgent: input.userAgent || null,
          metadata: input.metadata ?? undefined,
        },
      });
    } catch (err: any) {
      this.logger.warn(`AUDIT_LOG_FAILED ${err?.message || err}`);
      return null;
    }
  }

  async security(input: SecurityInput) {
    try {
      return await this.prisma.securityEventLog.create({
        data: {
          eventType: input.eventType,
          severity: (input.severity || "WARN") as any,
          actorId: input.actorId || null,
          actorEmail: input.actorEmail || null,
          ipAddress: input.ipAddress || null,
          userAgent: input.userAgent || null,
          path: input.path || null,
          method: input.method || null,
          message: input.message || null,
          metadata: input.metadata ?? undefined,
        },
      });
    } catch (err: any) {
      this.logger.warn(`SECURITY_LOG_FAILED ${err?.message || err}`);
      return null;
    }
  }

  async startJob(input: JobStartInput) {
    try {
      return await this.prisma.jobRunLog.create({
        data: {
          jobName: input.jobName,
          status: "RUNNING",
          severity: "INFO" as any,
          metadata: input.metadata ?? undefined,
        },
      });
    } catch (err: any) {
      this.logger.warn(`JOB_START_LOG_FAILED ${err?.message || err}`);
      return null;
    }
  }

  async finishJob(input: JobFinishInput) {
    try {
      const existing = await this.prisma.jobRunLog.findUnique({
        where: { id: input.id },
        select: { startedAt: true },
      });

      const finishedAt = new Date();
      const durationMs = existing?.startedAt
        ? finishedAt.getTime() - existing.startedAt.getTime()
        : null;

      return await this.prisma.jobRunLog.update({
        where: { id: input.id },
        data: {
          status: input.status,
          finishedAt,
          durationMs,
          severity: (input.severity || (input.status === "FAILED" ? "ERROR" : "INFO")) as any,
          summary: input.summary || null,
          metadata: input.metadata ?? undefined,
          error: input.error || null,
        },
      });
    } catch (err: any) {
      this.logger.warn(`JOB_FINISH_LOG_FAILED ${err?.message || err}`);
      return null;
    }
  }
}