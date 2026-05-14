import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export enum StreamerStreamSourceTypeDto {
  EXTERNAL_HLS = "EXTERNAL_HLS",
  YOUTUBE = "YOUTUBE",
}

export class SubmitStreamDto {
  @IsEnum(StreamerStreamSourceTypeDto)
  sourceType!: StreamerStreamSourceTypeDto;

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
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  embedUrl?: string;

  @IsOptional()
  @IsString()
  youtubeChannelId?: string;

  @IsOptional()
  @IsString()
  youtubeChannelName?: string;

  @IsOptional()
  @IsString()
  youtubeThumbnailUrl?: string;

  @IsOptional()
  @IsBoolean()
  youtubeEmbeddable?: boolean;

  @IsOptional()
  @IsString()
  youtubeLiveStatus?: string;
}

export class UpdateSubmittedStreamDto {
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
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  embedUrl?: string;

  @IsOptional()
  @IsString()
  youtubeChannelId?: string;

  @IsOptional()
  @IsString()
  youtubeChannelName?: string;

  @IsOptional()
  @IsString()
  youtubeThumbnailUrl?: string;

  @IsOptional()
  @IsBoolean()
  youtubeEmbeddable?: boolean;

  @IsOptional()
  @IsString()
  youtubeLiveStatus?: string;
}