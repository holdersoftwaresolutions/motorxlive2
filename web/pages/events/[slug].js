import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";

function getEmbedType(item) {
  if (!item) return "unknown";
  if (item.sourceType === "YOUTUBE" && item.youtubeVideoId) return "youtube";
  if (item.youtubeVideoId) return "youtube";
  if (item.playbackHlsUrl) return "hls";
  if (item.playbackDashUrl) return "dash";
  return "unknown";
}

function getStreamBadge(stream) {
  if (!stream) return "OFFLINE";
  if (stream.lifecycle === "LIVE") return "LIVE";
  if (stream.lifecycle === "READY") return "UPCOMING";
  if (stream.lifecycle === "ENDED") return "ENDED";
  return stream.lifecycle || "READY";
}

function getVideoBadge(video) {
  if (!video) return "VIDEO";
  if (video.youtubeLiveStatus === "live") return "LIVE";
  if (video.youtubeLiveStatus === "upcoming") return "UPCOMING";
  return "REPLAY";
}

function YouTubePlayer({ videoId, title = "Video Player" }) {
  if (!videoId) {
    return <div style={styles.playerFallback}>Missing YouTube video ID.</div>;
  }

  return (
    <div style={styles.videoWrap}>
      <iframe
        style={styles.iframe}
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function HlsPlayer({ src }) {
  const videoRef = useRef(null);

  useEffect(() => {
    let hlsInstance;

    async function setup() {
      const video = videoRef.current;
      if (!video || !src) return;

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        return;
      }

      try {
        const HlsModule = await import("hls.js");
        const Hls = HlsModule.default;

        if (Hls.isSupported()) {
          hlsInstance = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
          });

          hlsInstance.loadSource(src);
          hlsInstance.attachMedia(video);
        } else {
          video.src = src;
        }
      } catch {
        video.src = src;
      }
    }

    setup();

    return () => {
      if (hlsInstance) hlsInstance.destroy();
    };
  }, [src]);

  return (
    <div style={styles.videoWrap}>
      <video ref={videoRef} controls autoPlay playsInline style={styles.video} />
    </div>
  );
}

function MediaPlayer({ media }) {
  if (!media?.item) {
    return <div style={styles.playerFallback}>No stream or video available yet.</div>;
  }

  const embedType = getEmbedType(media.item);

  if (embedType === "youtube") {
    return (
      <YouTubePlayer
        videoId={media.item.youtubeVideoId}
        title={media.item.title || "MotorXLive Player"}
      />
    );
  }

  if (embedType === "hls") {
    return <HlsPlayer src={media.item.playbackHlsUrl} />;
  }

  if (embedType === "dash") {
    return (
      <div style={styles.playerFallback}>
        DASH source detected. Add dash.js later or provide HLS for broader browser support.
      </div>
    );
  }

  return <div style={styles.playerFallback}>Unsupported media source.</div>;
}

function formatDate(dateValue) {
  if (!dateValue) return "TBD";

  try {
    return new Date(dateValue).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "TBD";
  }
}

function getChannelLabel(item) {
  return (
    item?.youtubeChannelName ||
    item?.channelName ||
    item?.provider ||
    "MotorXLive"
  );
}

export default function EventWatchPage({ event, liveData, videoData }) {
  const displayEvent = liveData?.event || event;

  const streams = liveData?.streams || [];
  const videos =
    (videoData?.videos && videoData.videos.length
      ? videoData.videos
      : displayEvent?.videos) || [];

  const playableStreams = streams.filter(
    (stream) => stream.youtubeVideoId || stream.playbackHlsUrl || stream.playbackDashUrl
  );

  const playableVideos = videos.filter(
    (video) => video.youtubeVideoId || video.playbackHlsUrl || video.playbackDashUrl
  );

  const [selectedMedia, setSelectedMedia] = useState(null);

  useEffect(() => {
    if (selectedMedia) return;

    const primaryStream =
      liveData?.primaryStream ||
      playableStreams.find((stream) => stream.isPrimary) ||
      playableStreams.find((stream) => stream.lifecycle === "LIVE") ||
      playableStreams[0];

    if (primaryStream) {
      setSelectedMedia({ type: "stream", id: primaryStream.id });
      return;
    }

    if (playableVideos[0]) {
      setSelectedMedia({ type: "video", id: playableVideos[0].id });
    }
  }, [selectedMedia, liveData, playableStreams, playableVideos]);

  const selectedItem = useMemo(() => {
    if (selectedMedia?.type === "stream") {
      return playableStreams.find((stream) => stream.id === selectedMedia.id) || null;
    }

    if (selectedMedia?.type === "video") {
      return playableVideos.find((video) => video.id === selectedMedia.id) || null;
    }

    return null;
  }, [selectedMedia, playableStreams, playableVideos]);

  const selectedBadge =
    selectedMedia?.type === "stream"
      ? getStreamBadge(selectedItem)
      : getVideoBadge(selectedItem);

  if (!displayEvent || displayEvent.ok === false) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.title}>Event not found</h1>
          <p style={styles.mutedText}>This event may have been removed or not published yet.</p>
          <Link href="/" style={styles.link}>
            Back to homepage
          </Link>
        </div>
      </div>
    );
  }

  const locationLabel = [
    displayEvent?.venueName,
    displayEvent?.city,
    displayEvent?.state,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <>
      <Head>
        <title>{displayEvent?.title} | MotorXLive</title>
        <meta
          name="description"
          content={
            displayEvent?.description ||
            `Watch ${displayEvent?.title} on MotorXLive.`
          }
        />
      </Head>

      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.heroGrid}>
            <main style={styles.mainColumn}>
              <div style={styles.liveHeader}>
                <span style={styles.watchBadge}>WATCH</span>

                {selectedItem ? (
                  <span
                    style={{
                      ...styles.mediaBadge,
                      ...(selectedBadge === "LIVE" ? styles.liveNowBadge : {}),
                    }}
                  >
                    {selectedBadge}
                  </span>
                ) : null}

                {displayEvent?.category?.name ? (
                  <span style={styles.categoryBadge}>
                    {displayEvent.category.name}
                  </span>
                ) : null}
              </div>

              <h1 style={styles.title}>{displayEvent?.title}</h1>

              <div style={styles.metaRow}>
                <span>{formatDate(displayEvent?.startAt)}</span>
                {locationLabel ? <span>{locationLabel}</span> : null}
              </div>

              <section style={styles.playerCard}>
                <MediaPlayer media={{ type: selectedMedia?.type, item: selectedItem }} />
              </section>

              <div style={styles.nowWatching}>
                <div>
                  <div style={styles.nowWatchingLabel}>Now Watching</div>
                  <div style={styles.nowWatchingTitle}>
                    {selectedItem?.title || "No stream selected"}
                  </div>
                  <div style={styles.nowWatchingMeta}>
                    {selectedItem ? getChannelLabel(selectedItem) : "Waiting for content"}
                  </div>
                </div>

                <div style={styles.statusStack}>
                  <span style={styles.statusPill}>
                    {playableStreams.length} {playableStreams.length === 1 ? "stream" : "streams"}
                  </span>
                  <span style={styles.statusPill}>
                    {playableVideos.length} {playableVideos.length === 1 ? "video" : "videos"}
                  </span>
                </div>
              </div>

              {playableStreams.length > 0 ? (
                <section style={styles.infoCard}>
                  <div style={styles.sectionHeading}>Live & Upcoming Feeds</div>
                  <div style={styles.mediaGrid}>
                    {playableStreams.map((stream) => (
                      <button
                        key={stream.id}
                        type="button"
                        onClick={() => setSelectedMedia({ type: "stream", id: stream.id })}
                        style={{
                          ...styles.mediaCard,
                          ...(selectedMedia?.type === "stream" && selectedMedia?.id === stream.id
                            ? styles.mediaCardActive
                            : {}),
                        }}
                      >
                        <div style={styles.mediaCardTop}>
                          <span
                            style={{
                              ...styles.smallBadge,
                              ...(stream.lifecycle === "LIVE" ? styles.liveNowBadge : {}),
                            }}
                          >
                            {getStreamBadge(stream)}
                          </span>
                          {stream.isPrimary ? <span style={styles.primaryBadge}>PRIMARY</span> : null}
                        </div>
                        <div style={styles.mediaCardTitle}>{stream.title || "Live Feed"}</div>
                        <div style={styles.mediaCardMeta}>{getChannelLabel(stream)}</div>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              <section style={styles.infoCard}>
                <div style={styles.sectionHeading}>Replays & Videos</div>

                {!playableVideos.length ? (
                  <p style={styles.mutedText}>No videos published yet.</p>
                ) : (
                  <div style={styles.videoList}>
                    {playableVideos.map((video) => (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => setSelectedMedia({ type: "video", id: video.id })}
                        style={{
                          ...styles.videoRow,
                          ...(selectedMedia?.type === "video" && selectedMedia?.id === video.id
                            ? styles.mediaCardActive
                            : {}),
                        }}
                      >
                        {video.youtubeThumbnailUrl ? (
                          <img
                            src={video.youtubeThumbnailUrl}
                            alt={video.title}
                            style={styles.videoThumb}
                          />
                        ) : null}

                        <div style={styles.videoText}>
                          <div style={styles.videoTitle}>{video.title}</div>
                          <div style={styles.videoMeta}>
                            {getVideoBadge(video)} •{" "}
                            {video.publishedAt ? formatDate(video.publishedAt) : "Unscheduled"}
                          </div>
                          <div style={styles.videoMeta}>{getChannelLabel(video)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {displayEvent?.description ? (
                <section style={styles.infoCard}>
                  <div style={styles.sectionHeading}>About This Event</div>
                  <p style={styles.description}>{displayEvent.description}</p>
                </section>
              ) : null}
            </main>

            <aside style={styles.sideColumn}>
              {displayEvent?.heroImageUrl ? (
                <div style={styles.flyerCard}>
                  <img
                    src={displayEvent.heroImageUrl}
                    alt={displayEvent?.title || "Event flyer"}
                    style={styles.flyerImage}
                  />
                </div>
              ) : null}

              <section style={styles.infoCard}>
                <div style={styles.sectionHeading}>Event Details</div>
                <div style={styles.detailsGrid}>
                  <div>
                    <div style={styles.detailLabel}>Start</div>
                    <div style={styles.detailValue}>
                      {formatDate(displayEvent?.startAt)}
                    </div>
                  </div>
                  <div>
                    <div style={styles.detailLabel}>End</div>
                    <div style={styles.detailValue}>
                      {formatDate(displayEvent?.endAt)}
                    </div>
                  </div>
                  <div>
                    <div style={styles.detailLabel}>Venue</div>
                    <div style={styles.detailValue}>
                      {displayEvent?.venueName || "TBD"}
                    </div>
                  </div>
                  <div>
                    <div style={styles.detailLabel}>Location</div>
                    <div style={styles.detailValue}>
                      {[
                        displayEvent?.city,
                        displayEvent?.state,
                        displayEvent?.postalCode,
                      ]
                        .filter(Boolean)
                        .join(", ") || "TBD"}
                    </div>
                  </div>
                </div>
              </section>

              <section style={styles.infoCard}>
                <div style={styles.sectionHeading}>Quick Links</div>
                <div style={styles.quickLinks}>
                  <Link href="/" style={styles.link}>
                    Homepage
                  </Link>

                  {displayEvent?.category?.slug ? (
                    <Link href={`/categories/${displayEvent.category.slug}`} style={styles.link}>
                      More in {displayEvent.category.name}
                    </Link>
                  ) : null}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps(ctx) {
  const { slug } = ctx.params;
  const baseUrl =
    process.env.INTERNAL_API_BASE_URL ||
    process.env.API_BASE_URL ||
    "http://localhost:3001";

  try {
    const [eventRes, liveRes, videoRes] = await Promise.all([
      fetch(`${baseUrl}/public/events/${slug}`),
      fetch(`${baseUrl}/public/events/${slug}/live`),
      fetch(`${baseUrl}/public/events/${slug}/videos`),
    ]);

    const event = await eventRes.json();
    const liveData = await liveRes.json();
    const videoData = await videoRes.json();

    return {
      props: {
        event,
        liveData,
        videoData,
      },
    };
  } catch {
    return {
      props: {
        event: { ok: false },
        liveData: { streams: [] },
        videoData: { videos: [] },
      },
    };
  }
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0b0d10",
    color: "#f5f7fa",
    fontFamily: "system-ui",
  },
  container: {
    maxWidth: 1320,
    margin: "0 auto",
    padding: "24px 20px 60px",
  },
  heroGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 380px)",
    gap: 24,
  },
  mainColumn: {
    minWidth: 0,
  },
  sideColumn: {
    display: "grid",
    gap: 18,
    alignContent: "start",
  },
  liveHeader: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  watchBadge: {
    background: "#2563eb",
    color: "#fff",
    fontSize: 12,
    fontWeight: 800,
    borderRadius: 999,
    padding: "6px 10px",
    letterSpacing: 0.6,
  },
  mediaBadge: {
    background: "#4a3412",
    color: "#ffd28b",
    border: "1px solid #7a551d",
    fontSize: 12,
    fontWeight: 800,
    borderRadius: 999,
    padding: "6px 10px",
  },
  liveNowBadge: {
    background: "#c62828",
    color: "#fff",
    border: "1px solid #ff4d4d",
  },
  categoryBadge: {
    background: "#1b2a40",
    color: "#dbeafe",
    fontSize: 12,
    borderRadius: 999,
    padding: "6px 10px",
  },
  title: {
    margin: "0 0 10px",
    fontSize: 40,
    lineHeight: 1.05,
  },
  metaRow: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    color: "#c9d1d9",
    marginBottom: 18,
  },
  playerCard: {
    background: "#11161c",
    border: "1px solid #1f2937",
    borderRadius: 16,
    overflow: "hidden",
  },
  videoWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: "16 / 9",
    background: "#000",
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
  },
  video: {
    width: "100%",
    height: "100%",
    display: "block",
    background: "#000",
  },
  playerFallback: {
    padding: "72px 24px",
    textAlign: "center",
    color: "#9aa4af",
    background: "#0f141a",
  },
  nowWatching: {
    marginTop: 14,
    marginBottom: 18,
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    background: "#11161c",
    border: "1px solid #1f2937",
    borderRadius: 16,
    padding: 16,
    flexWrap: "wrap",
  },
  nowWatchingLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#8fb3ff",
    marginBottom: 4,
  },
  nowWatchingTitle: {
    fontSize: 18,
    fontWeight: 800,
  },
  nowWatchingMeta: {
    marginTop: 4,
    color: "#9aa4af",
    fontSize: 13,
  },
  statusStack: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  statusPill: {
    background: "#101827",
    border: "1px solid #243041",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 13,
    color: "#dbe4ee",
  },
  infoCard: {
    background: "#11161c",
    border: "1px solid #1f2937",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: 800,
    marginBottom: 14,
  },
  mediaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  mediaCard: {
    textAlign: "left",
    background: "#0f141a",
    color: "#f5f7fa",
    border: "1px solid #243041",
    borderRadius: 14,
    padding: 14,
    cursor: "pointer",
  },
  mediaCardActive: {
    borderColor: "#2563eb",
    boxShadow: "0 0 0 1px #2563eb",
  },
  mediaCardTop: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  smallBadge: {
    background: "#4a3412",
    color: "#ffd28b",
    border: "1px solid #7a551d",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 800,
  },
  primaryBadge: {
    background: "#123a28",
    color: "#8fd19e",
    border: "1px solid #215c41",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 800,
  },
  mediaCardTitle: {
    fontWeight: 800,
    marginBottom: 6,
  },
  mediaCardMeta: {
    color: "#9aa4af",
    fontSize: 13,
  },
  videoList: {
    display: "grid",
    gap: 12,
  },
  videoRow: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "140px 1fr",
    gap: 12,
    textAlign: "left",
    alignItems: "center",
    padding: 12,
    border: "1px solid #1f2937",
    borderRadius: 12,
    background: "#0f141a",
    color: "#f5f7fa",
    cursor: "pointer",
  },
  videoThumb: {
    width: "100%",
    aspectRatio: "16 / 9",
    objectFit: "cover",
    borderRadius: 10,
    background: "#000",
  },
  videoText: {
    minWidth: 0,
  },
  videoTitle: {
    fontWeight: 800,
  },
  videoMeta: {
    marginTop: 4,
    color: "#9aa4af",
    fontSize: 13,
  },
  description: {
    margin: 0,
    lineHeight: 1.7,
    color: "#d3d8de",
  },
  flyerCard: {
    background: "#11161c",
    border: "1px solid #1f2937",
    borderRadius: 16,
    overflow: "hidden",
  },
  flyerImage: {
    width: "100%",
    display: "block",
  },
  detailsGrid: {
    display: "grid",
    gap: 14,
  },
  detailLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#8b98a7",
    marginBottom: 6,
  },
  detailValue: {
    color: "#f5f7fa",
    lineHeight: 1.5,
  },
  quickLinks: {
    display: "grid",
    gap: 10,
  },
  link: {
    color: "#8fb3ff",
    textDecoration: "none",
  },
  mutedText: {
    color: "#9aa4af",
  },
};