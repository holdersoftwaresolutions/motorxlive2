import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export enum ContributorVideoSourceTypeDto {
  EXTERNAL_HLS = "EXTERNAL_HLS",
  YOUTUBE = "YOUTUBE",
}

export class SubmitVideoDto {
  @IsEnum(ContributorVideoSourceTypeDto)
  sourceType!: ContributorVideoSourceTypeDto;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  youtubeVideoId?: string;

  @IsOptional()
  @IsString()
  playbackHlsUrl?: string;

  @IsOptional()
  @IsString()
  playbackDashUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsString()
  publishedAt?: string;
}

export class UpdateSubmittedVideoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  youtubeVideoId?: string;

  @IsOptional()
  @IsString()
  playbackHlsUrl?: string;

  @IsOptional()
  @IsString()
  playbackDashUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsString()
  publishedAt?: string;
}