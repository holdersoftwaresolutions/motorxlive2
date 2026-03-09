import { Injectable } from "@nestjs/common";

@Injectable()
export class GeocodingService {
  async geocode(query: string) {
    const userAgent =
      process.env.GEOCODING_USER_AGENT ||
      "MotorXLive/1.0 (contact: admin@motorxlive.local)";

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("countrycodes", "us");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": userAgent,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Geocoding request failed with status ${res.status}`);
    }

    const results = await res.json();

    if (!Array.isArray(results) || results.length === 0) {
      return {
        ok: false,
        error: "No matching location found",
      };
    }

    const best = results[0];

    return {
      ok: true,
      lat: Number(best.lat),
      lng: Number(best.lon),
      displayName: best.display_name,
      raw: best,
    };
  }
}