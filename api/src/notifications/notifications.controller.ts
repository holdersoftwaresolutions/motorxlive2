import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  listNotifications() {
    return this.notifications.listNotifications();
  }

  @Post("live-now/:streamId")
  createLiveNow(@Param("streamId") streamId: string) {
    return this.notifications.createLiveNowNotification(streamId);
  }

  @Post(":id/mark-sent")
  markSent(@Param("id") id: string) {
    return this.notifications.markNotificationSent(id);
  }

  @Post(":id/mark-failed")
  markFailed(@Param("id") id: string) {
    return this.notifications.markNotificationFailed(id, "Manually marked failed");
  }
}