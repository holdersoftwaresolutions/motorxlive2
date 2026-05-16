import { Module } from "@nestjs/common";
import { ContributorEventsController } from "./contributor-events.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ContributorEventsController],
})
export class ContributorEventsModule {}