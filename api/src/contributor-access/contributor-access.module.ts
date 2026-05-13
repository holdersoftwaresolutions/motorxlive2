import { Module } from "@nestjs/common";
import { ContributorAccessController } from "./contributor-access.controller";
import { ContributorAccessService } from "./contributor-access.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuditModule, AuthModule],
  controllers: [ContributorAccessController],
  providers: [ContributorAccessService],
})
export class ContributorAccessModule {}