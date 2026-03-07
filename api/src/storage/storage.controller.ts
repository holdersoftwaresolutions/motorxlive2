import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";
import { StorageService } from "./storage.service";
import { AdminKeyGuard } from "../auth/admin-key.guard";

class CreateFlyerUploadDto {
  @IsString()
  contentType!: string;

  @IsOptional()
  @IsString()
  filename?: string;
}

@UseGuards(AdminKeyGuard)
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