import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { GeocodingService } from "../geocoding/geocoding.service";

@Controller()
export class PublicGeocodeController {
  constructor(private readonly geocoding: GeocodingService) {}

  @Get("public/geocode")
  async geocode(@Query("q") q?: string) {
    if (!q || !q.trim()) {
      throw new BadRequestException("Missing q");
    }

    return this.geocoding.geocode(q.trim());
  }
}