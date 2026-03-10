import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";
import { StorageService } from "./storage.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";


class CreateFlyerUploadDto {
  @IsString()
  contentType!: string;

  @IsOptional()
  @IsString()
  filename?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/uploads")
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post("flyer")
  async createFlyerUpload(@Body() dto: CreateFlyerUploadDto) {
    return this.storage.createFlyerUploadUrl({
      contentType: dto.contentType,
      filename: dto.filename,
    });
  }
}