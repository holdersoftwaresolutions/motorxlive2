import { Injectable } from "@nestjs/common";

@Injectable()
export class MapboxLocationService {
  private get token() {
    const token = process.env.MAPBOX_ACCESS_TOKEN;
    if (!token) {
      throw new Error("MAPBOX_ACCESS_TOKEN is not configured");
    }
    return token;
  }

  async suggest(query: string, sessionToken: string) {
    const url = new URL("https://api.mapbox.com/search/searchbox/v1/suggest");

    url.searchParams.set("q", query);
    url.searchParams.set("language", "en");
    url.searchParams.set("country", "US");
    url.searchParams.set("limit", "5");
    url.searchParams.set("types", "place,postcode,locality,district,region");
    url.searchParams.set("session_token", sessionToken);
    url.searchParams.set("access_token", this.token);

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Mapbox suggest failed with status ${res.status}`);
    }

    const json = await res.json();

    return {
      ok: true,
      suggestions: (json.suggestions || []).map((item: any) => ({
        mapboxId: item.mapbox_id,
        name: item.name,
        placeFormatted: item.place_formatted,
        fullAddress: item.full_address || item.place_formatted || item.name,
      })),
    };
  }

  async retrieve(mapboxId: string, sessionToken: string) {
    const url = new URL("https://api.mapbox.com/search/searchbox/v1/retrieve/" + encodeURIComponent(mapboxId));

    url.searchParams.set("session_token", sessionToken);
    url.searchParams.set("access_token", this.token);

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Mapbox retrieve failed with status ${res.status}`);
    }

    const json = await res.json();
    const feature = json.features?.[0];

    if (!feature) {
      return {
        ok: false,
        error: "No matching location found",
      };
    }

    const [lng, lat] = feature.geometry?.coordinates || [];

    return {
      ok: true,
      lat,
      lng,
      displayName:
        feature.properties?.full_address ||
        feature.properties?.name ||
        feature.properties?.place_formatted ||
        "Selected location",
      raw: feature,
    };
  }
}