import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { randomUUID } from "crypto";
import { MapboxLocationService } from "../geocoding/mapbox-location.service";

@Controller()
export class PublicLocationController {
  constructor(private readonly mapbox: MapboxLocationService) {}

  @Get("public/location/suggest")
  async suggest(
    @Query("q") q?: string,
    @Query("sessionToken") sessionToken?: string
  ) {
    if (!q || !q.trim()) {
      throw new BadRequestException("Missing q");
    }

    return this.mapbox.suggest(q.trim(), sessionToken || randomUUID());
  }

  @Get("public/location/retrieve")
  async retrieve(
    @Query("mapboxId") mapboxId?: string,
    @Query("sessionToken") sessionToken?: string
  ) {
    if (!mapboxId) {
      throw new BadRequestException("Missing mapboxId");
    }

    return this.mapbox.retrieve(mapboxId, sessionToken || randomUUID());
  }
}