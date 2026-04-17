import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export enum StreamSourceTypeDto {
  MANAGED_LIVE = "MANAGED_LIVE",
  EXTERNAL_HLS = "EXTERNAL_HLS",
  YOUTUBE = "YOUTUBE",
}

export enum StreamLifecycleStatusDto {
  CREATED = "CREATED",
  READY = "READY",
  LIVE = "LIVE",
  ENDED = "ENDED",
  DISABLED = "DISABLED",
  ERROR = "ERROR",
}

export class CreateStreamDto {
  @IsEnum(StreamSourceTypeDto)
  sourceType!: StreamSourceTypeDto;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  priority?: number;

  @IsOptional()
  @IsString()
  playbackHlsUrl?: string;

  @IsOptional()
  @IsString()
  playbackDashUrl?: string;

  @IsOptional()
  @IsString()
  youtubeUrl?: string;

  @IsOptional()
  @IsString()
  youtubeVideoId?: string;

  @IsOptional()
  @IsEnum(StreamLifecycleStatusDto)
  lifecycle?: StreamLifecycleStatusDto;
}

export class UpdateStreamDto {
  @IsOptional()
  @IsEnum(StreamSourceTypeDto)
  sourceType?: StreamSourceTypeDto;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  priority?: number;

  @IsOptional()
  @IsString()
  playbackHlsUrl?: string;

  @IsOptional()
  @IsString()
  playbackDashUrl?: string;

  @IsOptional()
  @IsString()
  youtubeUrl?: string;

  @IsOptional()
  @IsString()
  youtubeVideoId?: string;

  @IsOptional()
  @IsEnum(StreamLifecycleStatusDto)
  lifecycle?: StreamLifecycleStatusDto;
}