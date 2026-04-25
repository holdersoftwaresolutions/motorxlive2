import { YouTubeChannelCategory } from "@prisma/client";

export function classifyYouTubeChannel(input: {
  title?: string | null;
  description?: string | null;
  videoTitles?: string[];
}): YouTubeChannelCategory {
  const text = [
    input.title || "",
    input.description || "",
    ...(input.videoTitles || []),
  ]
    .join(" ")
    .toLowerCase();

  if (
    text.includes("drag racing") ||
    text.includes("no prep") ||
    text.includes("bracket racing") ||
    text.includes("grudge racing") ||
    text.includes("radial racing") ||
    text.includes("small tire") ||
    text.includes("big tire")
  ) {
    return "DRAG_RACING";
  }

  if (
    text.includes("sxs") ||
    text.includes("utv") ||
    text.includes("side by side") ||
    text.includes("rzr") ||
    text.includes("can-am")
  ) {
    return "SXS_UTV";
  }

  if (
    text.includes("offroad") ||
    text.includes("off-road") ||
    text.includes("mud bog") ||
    text.includes("rock bouncer")
  ) {
    return "OFFROAD";
  }

  if (
    text.includes("podcast") ||
    text.includes("episode") ||
    text.includes("interview")
  ) {
    return "MOTORSPORTS_PODCAST";
  }

  if (
    text.includes("raceway") ||
    text.includes("dragway") ||
    text.includes("speedway") ||
    text.includes("motorsports park")
  ) {
    return "TRACK_CHANNEL";
  }

  if (
    text.includes("promoter") ||
    text.includes("series") ||
    text.includes("events")
  ) {
    return "EVENT_PROMOTER";
  }

  if (
    text.includes("media") ||
    text.includes("films") ||
    text.includes("photography") ||
    text.includes("live")
  ) {
    return "CREATOR_MEDIA";
  }

  return "GENERAL_MOTORSPORTS";
}