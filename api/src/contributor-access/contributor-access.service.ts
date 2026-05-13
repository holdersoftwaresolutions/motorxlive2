import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateContributorAccessRequestDto,
  ReviewContributorAccessRequestDto,
} from "./contributor-access.dto";
import { AuditService } from "../audit/audit.service";
import { hash } from "bcryptjs";

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

function generateTemporaryPassword() {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MXL-${part()}-${part()}-${part()}`;
}

function mapRequestedRoleToUserRole(roleRequested: string) {
  if (roleRequested === "MEDIA") return "MEDIA";
  return "STREAMER";
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

      return { ok: true, received: true };
    }

    const email = normalizeEmail(dto.email);

    const existingPending = await this.prisma.contributorAccessRequest.findFirst({
      where: { email, status: "PENDING" as any },
      orderBy: { createdAt: "desc" },
    });

    if (existingPending) {
      return { ok: true, received: true, duplicatePending: true };
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

    return { ok: true, received: true, id: created.id };
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
    const request = await this.prisma.contributorAccessRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return {
        ok: false,
        error: "Contributor access request not found.",
      };
    }

    const email = normalizeEmail(request.email);

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    let createdUser: any = null;
    let temporaryPassword: string | null = null;
    let userAlreadyExists = false;

    if (existingUser) {
      userAlreadyExists = true;
    } else {
      temporaryPassword = generateTemporaryPassword();
      const passwordHash = await hash(temporaryPassword, 10);

      createdUser = await this.prisma.user.create({
        data: {
          email,
          name: request.name?.trim() || null,
          passwordHash,
          role: mapRequestedRoleToUserRole(request.roleRequested) as any,
          isActive: true,
        },
      });
    }

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
        userCreated: !!createdUser,
        userAlreadyExists,
        createdUserId: createdUser?.id || existingUser?.id || null,
        note: "Email invite is not automated yet. Temporary password shown once to admin.",
      },
    });

    return {
      ok: true,
      request: updated,
      userCreated: !!createdUser,
      userAlreadyExists,
      user: createdUser
        ? {
            id: createdUser.id,
            email: createdUser.email,
            name: createdUser.name,
            role: createdUser.role,
            isActive: createdUser.isActive,
          }
        : existingUser
        ? {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name,
            role: existingUser.role,
            isActive: existingUser.isActive,
          }
        : null,
      temporaryPassword,
      message: createdUser
        ? "Request approved and contributor user created. Temporary password is shown once."
        : "Request approved. A user with this email already exists.",
    };
  }

  async getRequestCounts() {
    const [pending, approved, rejected, total] = await Promise.all([
      this.prisma.contributorAccessRequest.count({
        where: { status: "PENDING" as any },
      }),
      this.prisma.contributorAccessRequest.count({
        where: { status: "APPROVED" as any },
      }),
      this.prisma.contributorAccessRequest.count({
        where: { status: "REJECTED" as any },
      }),
      this.prisma.contributorAccessRequest.count(),
    ]);

    return {
      pending,
      approved,
      rejected,
      total,
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