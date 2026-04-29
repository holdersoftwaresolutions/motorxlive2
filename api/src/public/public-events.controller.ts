import { Controller, Get, Param, Query } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

@Controller()
export class PublicEventsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("public/events")
  async listEvents(
    @Query("category") categorySlug?: string,
    @Query("page") pageStr?: string,
    @Query("pageSize") pageSizeStr?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("lat") latStr?: string,
    @Query("lng") lngStr?: string,
    @Query("radiusMiles") radiusStr?: string,
    @Query("q") q?: string
  ) {
    const page = Math.max(1, Number(pageStr || 1));
    const pageSize = Math.max(1, Math.min(100, Number(pageSizeStr || 24)));

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    const lat = latStr ? Number(latStr) : undefined;
    const lng = lngStr ? Number(lngStr) : undefined;
    const radiusMiles = radiusStr ? Math.max(1, Number(radiusStr)) : undefined;

    const hasRadiusSearch =
      typeof lat === "number" &&
      !Number.isNaN(lat) &&
      typeof lng === "number" &&
      !Number.isNaN(lng) &&
      typeof radiusMiles === "number" &&
      !Number.isNaN(radiusMiles);

    let latitudeFilter: any = undefined;
    let longitudeFilter: any = undefined;

    if (hasRadiusSearch) {
      const latDelta = radiusMiles / 69;
      const lngDelta = radiusMiles / (69 * Math.cos((lat * Math.PI) / 180));

      latitudeFilter = {
        gte: lat - latDelta,
        lte: lat + latDelta,
      };

      longitudeFilter = {
        gte: lng - lngDelta,
        lte: lng + lngDelta,
      };
    }

    const where: any = {
      category: categorySlug ? { slug: categorySlug } : undefined,
      startAt:
        fromDate || toDate
          ? {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            }
          : undefined,
      latitude: latitudeFilter,
      longitude: longitudeFilter,
      OR: q
        ? [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { venueName: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { state: { contains: q, mode: "insensitive" } },
          ]
        : undefined,
    };

    const rawItems = await this.prisma.event.findMany({
      where,
      orderBy: [
        { category: { sortOrder: "asc" } },
        { startAt: "asc" },
        { title: "asc" },
      ],
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            sortOrder: true,
          },
        },
        streams: {
          where: {
            moderationStatus: "APPROVED",
            lifecycle: {
              in: ["LIVE", "READY"],
            },
          },
          select: {
            id: true,
            lifecycle: true,
            moderationStatus: true,
            isPrimary: true,
            priority: true,
            title: true,
            youtubeVideoId: true,
          },
          orderBy: [
            { lifecycle: "desc" },
            { isPrimary: "desc" },
            { priority: "asc" },
          ],
        },
      },
    });

    let filteredItems = rawItems;

    if (hasRadiusSearch) {
      filteredItems = rawItems
        .map((event) => {
          if (event.latitude == null || event.longitude == null) {
            return { ...event, distanceMiles: null };
          }

          const distanceMiles = haversineMiles(
            lat,
            lng,
            event.latitude,
            event.longitude
          );

          return { ...event, distanceMiles };
        })
        .filter((event) => event.distanceMiles != null && event.distanceMiles <= radiusMiles)
        .sort((a, b) => {
          if (a.distanceMiles == null) return 1;
          if (b.distanceMiles == null) return -1;
          return a.distanceMiles - b.distanceMiles;
        });
    }

    const total = filteredItems.length;
    const skip = (page - 1) * pageSize;
    const items = filteredItems.slice(skip, skip + pageSize);

    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  @Get("public/events/:slug")
  async getEventBySlug(@Param("slug") slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            sortOrder: true,
          },
        },
        videos: {
          where: {
            moderationStatus: "APPROVED",
            status: "READY",
          },
          orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!event) {
      return { ok: false, error: "Event not found" };
    }

    return event;
  }
}