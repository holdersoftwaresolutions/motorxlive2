import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateContributorAccessRequestDto,
  ReviewContributorAccessRequestDto,
} from "./contributor-access.dto";
import { AuditService } from "../audit/audit.service";

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

@Injectable()
export class ContributorAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async createPublicRequest(dto: CreateContributorAccessRequestDto, meta?: any) {
    if (dto.companyWebsite?.trim()) {
      await this.audit.security({
        eventType: "CONTRIBUTOR_ACCESS_HONEYPOT_TRIGGERED",
        severity: "WARN",
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        metadata: {
          email: dto.email,
          honeypot: dto.companyWebsite,
        },
      });

      return {
        ok: true,
        received: true,
      };
    }

    const email = normalizeEmail(dto.email);

    const existingPending = await this.prisma.contributorAccessRequest.findFirst({
      where: {
        email,
        status: "PENDING" as any,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (existingPending) {
      return {
        ok: true,
        received: true,
        duplicatePending: true,
      };
    }

    const created = await this.prisma.contributorAccessRequest.create({
      data: {
        name: dto.name.trim(),
        email,
        phone: dto.phone?.trim() || null,
        organizationName: dto.organizationName?.trim() || null,
        roleRequested: dto.roleRequested as any,
        websiteOrSocialUrl: dto.websiteOrSocialUrl?.trim() || null,
        youtubeChannelUrl: dto.youtubeChannelUrl?.trim() || null,
        reason: dto.reason?.trim() || null,
      },
    });

    await this.audit.audit({
      action: "CONTRIBUTOR_ACCESS_REQUEST_CREATED",
      resource: "CONTRIBUTOR_ACCESS_REQUEST",
      resourceId: created.id,
      actorType: "ANONYMOUS",
      actorEmail: email,
      severity: "INFO",
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: {
        roleRequested: created.roleRequested,
        organizationName: created.organizationName,
      },
    });

    return {
      ok: true,
      received: true,
      id: created.id,
    };
  }

  async listAdminRequests(status?: string) {
    const where: any = {};

    if (status?.trim()) {
      where.status = status.trim().toUpperCase();
    }

    return this.prisma.contributorAccessRequest.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: 200,
    });
  }

  async approveRequest(
    id: string,
    dto: ReviewContributorAccessRequestDto,
    reviewer?: any,
    meta?: any
  ) {
    const updated = await this.prisma.contributorAccessRequest.update({
      where: { id },
      data: {
        status: "APPROVED" as any,
        adminNotes: dto.adminNotes?.trim() || null,
        reviewedByUserId: reviewer?.id || reviewer?.sub || null,
        reviewedAt: new Date(),
      },
    });

    await this.audit.audit({
      action: "CONTRIBUTOR_ACCESS_REQUEST_APPROVED",
      resource: "CONTRIBUTOR_ACCESS_REQUEST",
      resourceId: id,
      actorType: "ADMIN",
      actorId: reviewer?.id || reviewer?.sub || null,
      actorEmail: reviewer?.email || null,
      severity: "INFO",
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: {
        email: updated.email,
        roleRequested: updated.roleRequested,
        note: "Phase 1 approval only. No user account created automatically.",
      },
    });

    return {
      ok: true,
      request: updated,
      userCreated: false,
      message:
        "Request approved. User account creation/email invite is not automated yet.",
    };
  }

  async rejectRequest(
    id: string,
    dto: ReviewContributorAccessRequestDto,
    reviewer?: any,
    meta?: any
  ) {
    const updated = await this.prisma.contributorAccessRequest.update({
      where: { id },
      data: {
        status: "REJECTED" as any,
        adminNotes: dto.adminNotes?.trim() || null,
        reviewedByUserId: reviewer?.id || reviewer?.sub || null,
        reviewedAt: new Date(),
      },
    });

    await this.audit.audit({
      action: "CONTRIBUTOR_ACCESS_REQUEST_REJECTED",
      resource: "CONTRIBUTOR_ACCESS_REQUEST",
      resourceId: id,
      actorType: "ADMIN",
      actorId: reviewer?.id || reviewer?.sub || null,
      actorEmail: reviewer?.email || null,
      severity: "INFO",
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: {
        email: updated.email,
        roleRequested: updated.roleRequested,
      },
    });

    return {
      ok: true,
      request: updated,
    };
  }
}