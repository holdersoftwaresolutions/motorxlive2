import { Module } from "@nestjs/common";
import { MapboxLocationService } from "./mapbox-location.service";

@Module({
  providers: [MapboxLocationService],
  exports: [MapboxLocationService],
})
export class MapboxLocationModule {}