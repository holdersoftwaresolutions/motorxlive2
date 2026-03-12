import { IsOptional, IsString, MaxLength } from "class-validator";

export class RejectSubmissionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}