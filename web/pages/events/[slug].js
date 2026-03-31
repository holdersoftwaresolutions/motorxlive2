import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";

function getEmbedType(stream) {
  if (!stream) return "unknown";
  if (stream.sourceType === "YOUTUBE" && stream.youtubeVideoId) return "youtube";
  if (stream.playbackHlsUrl) return "hls";
  if (stream.playbackDashUrl) return "dash";
  return "unknown";
}

function getVideoEmbedType(video) {
  if (!video) return "unknown";
  if (video.youtubeVideoId) return "youtube";
  if (video.playbackHlsUrl) return "hls";
  if (video.playbackDashUrl) return "dash";
  return "unknown";
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
      <video
        ref={videoRef}
        controls
        autoPlay
        playsInline
        style={styles.video}
      />
    </div>
  );
}

function StreamPlayer({ stream }) {
  const embedType = getEmbedType(stream);

  if (!stream) {
    return <div style={styles.playerFallback}>No live stream available yet.</div>;
  }

  if (embedType === "youtube") {
    return <YouTubePlayer videoId={stream.youtubeVideoId} title={stream.title || "Live Stream"} />;
  }

  if (embedType === "hls") {
    return <HlsPlayer src={stream.playbackHlsUrl} />;
  }

  if (embedType === "dash" && stream.playbackDashUrl) {
    return (
      <div style={styles.playerFallback}>
        DASH source detected. Add dash.js later or provide HLS for broader browser support.
      </div>
    );
  }

  return <div style={styles.playerFallback}>Unsupported stream type.</div>;
}

function VideoPlayer({ video }) {
  const embedType = getVideoEmbedType(video);

  if (!video) {
    return <div style={styles.playerFallback}>No video selected.</div>;
  }

  if (embedType === "youtube") {
    return <YouTubePlayer videoId={video.youtubeVideoId} title={video.title || "Event Video"} />;
  }

  if (embedType === "hls") {
    return <HlsPlayer src={video.playbackHlsUrl} />;
  }

  if (embedType === "dash" && video.playbackDashUrl) {
    return (
      <div style={styles.playerFallback}>
        DASH video detected. Add dash.js later or provide HLS for broader browser support.
      </div>
    );
  }

  return <div style={styles.playerFallback}>Unsupported video type.</div>;
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

export default function EventWatchPage({ event, liveData, videoData }) {
  const streams = liveData?.streams || [];
  const approvedVideos =
    (videoData?.videos && videoData.videos.length ? videoData.videos : event?.videos) || [];

  const [selectedMedia, setSelectedMedia] = useState(() => {
    const firstStream = liveData?.primaryStream || liveData?.streams?.[0] || null;
    const firstVideo = approvedVideos?.[0] || null;

    if (firstStream) {
      return { type: "stream", id: firstStream.id };
    }

    if (firstVideo) {
      return { type: "video", id: firstVideo.id };
    }

    return null;
  });

  useEffect(() => {
    if (!selectedMedia) {
      if (streams.length > 0) {
        setSelectedMedia({ type: "stream", id: streams[0].id });
        return;
      }

      if (approvedVideos.length > 0) {
        setSelectedMedia({ type: "video", id: approvedVideos[0].id });
      }
    }
  }, [selectedMedia, streams, approvedVideos]);

  const selectedStream = useMemo(() => {
    if (selectedMedia?.type !== "stream") return null;
    return streams.find((stream) => stream.id === selectedMedia.id) || streams[0] || null;
  }, [selectedMedia, streams]);

  const selectedVideo = useMemo(() => {
    if (selectedMedia?.type !== "video") return null;
    return approvedVideos.find((video) => video.id === selectedMedia.id) || approvedVideos[0] || null;
  }, [selectedMedia, approvedVideos]);

  if (!event || event.ok === false) {
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

  const locationLabel = [event.venueName, event.city, event.state]
    .filter(Boolean)
    .join(" • ");

  return (
    <>
      <Head>
        <title>{event.title} | MotorXLive</title>
        <meta
          name="description"
          content={event.description || `Watch ${event.title} on MotorXLive.`}
        />
      </Head>

      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.heroGrid}>
            <div style={styles.mainColumn}>
              <div style={styles.liveHeader}>
                <span style={styles.liveBadge}>WATCH</span>
                {event.category?.name ? (
                  <span style={styles.categoryBadge}>{event.category.name}</span>
                ) : null}
              </div>

              <h1 style={styles.title}>{event.title}</h1>

              <div style={styles.metaRow}>
                <span>{formatDate(event.startAt)}</span>
                {locationLabel ? <span>{locationLabel}</span> : null}
              </div>

              <div style={styles.playerCard}>
                {selectedMedia?.type === "stream" ? (
                  <StreamPlayer stream={selectedStream} />
                ) : selectedMedia?.type === "video" ? (
                  <VideoPlayer video={selectedVideo} />
                ) : (
                  <div style={styles.playerFallback}>No stream or video available yet.</div>
                )}
              </div>

              <div style={styles.statusStrip}>
                <div style={styles.statusPill}>
                  {selectedMedia?.type === "stream" && selectedStream
                    ? `Watching live: ${selectedStream.title || "Primary feed"}`
                    : selectedMedia?.type === "video" && selectedVideo
                    ? `Watching video: ${selectedVideo.title || "Replay"}`
                    : "No stream or video selected"}
                </div>
                <div style={styles.statusPill}>
                  {streams.length
                    ? `${streams.length} approved ${streams.length === 1 ? "stream" : "streams"}`
                    : "No live feeds returned"}
                </div>
                <div style={styles.statusPill}>
                  {approvedVideos.length} published {approvedVideos.length === 1 ? "video" : "videos"}
                </div>
              </div>

              {streams.length > 0 ? (
                <div style={styles.streamSwitcher}>
                  <div style={styles.sectionHeading}>Available Streams</div>
                  <div style={styles.streamTabs}>
                    {streams.map((stream, index) => (
                      <button
                        key={stream.id}
                        type="button"
                        onClick={() => setSelectedMedia({ type: "stream", id: stream.id })}
                        style={{
                          ...styles.streamTab,
                          ...(selectedMedia?.type === "stream" && selectedMedia?.id === stream.id
                            ? styles.streamTabActive
                            : {}),
                        }}
                      >
                        {stream.title || `Stream ${index + 1}`}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {event.description ? (
                <div style={styles.infoCard}>
                  <div style={styles.sectionHeading}>About This Event</div>
                  <p style={styles.description}>{event.description}</p>
                </div>
              ) : null}

              <div style={styles.infoCard}>
                <div style={styles.sectionHeading}>Event Details</div>
                <div style={styles.detailsGrid}>
                  <div>
                    <div style={styles.detailLabel}>Start</div>
                    <div style={styles.detailValue}>{formatDate(event.startAt)}</div>
                  </div>
                  <div>
                    <div style={styles.detailLabel}>End</div>
                    <div style={styles.detailValue}>{formatDate(event.endAt)}</div>
                  </div>
                  <div>
                    <div style={styles.detailLabel}>Venue</div>
                    <div style={styles.detailValue}>{event.venueName || "TBD"}</div>
                  </div>
                  <div>
                    <div style={styles.detailLabel}>Location</div>
                    <div style={styles.detailValue}>
                      {[event.city, event.state, event.postalCode].filter(Boolean).join(", ") || "TBD"}
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.infoCard}>
                <div style={styles.sectionHeading}>Replays & Videos</div>
                {!approvedVideos.length ? (
                  <p style={styles.mutedText}>No videos published yet.</p>
                ) : (
                  <div style={styles.videoList}>
                    {approvedVideos.map((video) => (
                      <div key={video.id} style={styles.videoRow}>
                        <div>
                          <div style={styles.videoTitle}>{video.title}</div>
                          <div style={styles.videoMeta}>
                            {video.publishedAt ? formatDate(video.publishedAt) : "Unscheduled"}
                          </div>
                        </div>

                        {(video.youtubeVideoId || video.playbackHlsUrl || video.playbackDashUrl) ? (
                          <button
                            type="button"
                            onClick={() => setSelectedMedia({ type: "video", id: video.id })}
                            style={styles.linkButton}
                          >
                            Watch
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <aside style={styles.sideColumn}>
              {event.heroImageUrl ? (
                <div style={styles.flyerCard}>
                  <img
                    src={event.heroImageUrl}
                    alt={event.title}
                    style={styles.flyerImage}
                  />
                </div>
              ) : null}

              <div style={styles.infoCard}>
                <div style={styles.sectionHeading}>Quick Links</div>
                <div style={styles.quickLinks}>
                  <Link href="/" style={styles.link}>
                    Homepage
                  </Link>
                  {event.category?.slug ? (
                    <Link href={`/categories/${event.category.slug}`} style={styles.link}>
                      More in {event.category.name}
                    </Link>
                  ) : null}
                </div>
              </div>

              <div style={styles.infoCard}>
                <div style={styles.sectionHeading}>Viewing Tips</div>
                <ul style={styles.tipList}>
                  <li>Use the stream and video buttons to switch what plays in the main player.</li>
                  <li>Approved videos can play here even when there is no active live feed.</li>
                  <li>Refresh if a newly approved stream or video does not appear immediately.</li>
                  <li>For Chrome/Edge, HLS playback is handled automatically.</li>
                </ul>
              </div>
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
  liveBadge: {
    background: "#c62828",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    borderRadius: 999,
    padding: "6px 10px",
    letterSpacing: 0.6,
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
    padding: "48px 24px",
    textAlign: "center",
    color: "#9aa4af",
    background: "#0f141a",
  },
  statusStrip: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 14,
    marginBottom: 18,
  },
  statusPill: {
    background: "#101827",
    border: "1px solid #243041",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 13,
    color: "#dbe4ee",
  },
  streamSwitcher: {
    marginBottom: 18,
  },
  streamTabs: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  streamTab: {
    border: "1px solid #243041",
    background: "#11161c",
    color: "#dbe4ee",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
  },
  streamTabActive: {
    background: "#1d4ed8",
    borderColor: "#1d4ed8",
    color: "#fff",
  },
  infoCard: {
    background: "#11161c",
    border: "1px solid #1f2937",
    borderRadius: 16,
    padding: 18,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 14,
  },
  description: {
    margin: 0,
    lineHeight: 1.7,
    color: "#d3d8de",
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
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
  videoList: {
    display: "grid",
    gap: 12,
  },
  videoRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    padding: "12px 14px",
    border: "1px solid #1f2937",
    borderRadius: 12,
    background: "#0f141a",
  },
  videoTitle: {
    fontWeight: 600,
    color: "#f5f7fa",
  },
  videoMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#9aa4af",
  },
  linkButton: {
    background: "#2563eb",
    color: "#fff",
    textDecoration: "none",
    borderRadius: 10,
    padding: "10px 14px",
    display: "inline-block",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
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
  quickLinks: {
    display: "grid",
    gap: 10,
  },
  link: {
    color: "#8fb3ff",
    textDecoration: "none",
  },
  tipList: {
    margin: 0,
    paddingLeft: 18,
    color: "#d3d8de",
    display: "grid",
    gap: 8,
  },
  mutedText: {
    color: "#9aa4af",
  },
};