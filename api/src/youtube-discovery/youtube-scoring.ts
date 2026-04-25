export function scoreYouTubeChannel(input: {
  title?: string | null;
  description?: string | null;
  videoTitles?: string[];
  liveCount?: number;
  upcomingCount?: number;
  completedCount?: number;
  embeddableCount?: number;
  totalVideosChecked?: number;
}) {
  let score = 0;
  const reasons: string[] = [];

  const text = [
    input.title || "",
    input.description || "",
    ...(input.videoTitles || []),
  ]
    .join(" ")
    .toLowerCase();

  const motorsportsKeywords = [
    "drag racing",
    "no prep",
    "bracket racing",
    "grudge racing",
    "radial racing",
    "offroad",
    "off-road",
    "sxs",
    "utv",
    "motorsports",
    "raceway",
    "dragway",
  ];

  if ((input.liveCount || 0) > 0 || (input.upcomingCount || 0) > 0) {
    score += 40;
    reasons.push("Has live or upcoming streams");
  }

  if ((input.completedCount || 0) > 0) {
    score += 25;
    reasons.push("Has completed livestreams");
  }

  if (motorsportsKeywords.some((keyword) => text.includes(keyword))) {
    score += 20;
    reasons.push("Motorsports keyword match");
  }

  if (text.includes("podcast") || text.includes("interview")) {
    score += 10;
    reasons.push("Podcast/interview content detected");
  }

  if (
    input.totalVideosChecked &&
    input.embeddableCount &&
    input.embeddableCount / input.totalVideosChecked >= 0.75
  ) {
    score += 10;
    reasons.push("Most checked videos are embeddable");
  }

  if (text.includes("#shorts") || text.includes("shorts")) {
    score -= 30;
    reasons.push("Likely shorts-heavy content");
  }

  return { score, reasons };
}