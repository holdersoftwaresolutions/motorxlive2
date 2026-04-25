import { IsString } from "class-validator";

export class YouTubeAutofillDto {
  @IsString()
  url!: string;
}