import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export enum ContributorAccessRoleRequestedDto {
  STREAMER = "STREAMER",
  MEDIA = "MEDIA",
  TRACK = "TRACK",
  PROMOTER = "PROMOTER",
  OTHER = "OTHER",
}

export class CreateContributorAccessRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(180)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  organizationName?: string;

  @IsEnum(ContributorAccessRoleRequestedDto)
  roleRequested!: ContributorAccessRoleRequestedDto;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  websiteOrSocialUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  youtubeChannelUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  reason?: string;

  // Honeypot. Public form should leave this empty.
  @IsOptional()
  @IsString()
  companyWebsite?: string;
}

export class ReviewContributorAccessRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1500)
  adminNotes?: string;
}