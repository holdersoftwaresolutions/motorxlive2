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

function YouTubePlayer({ videoId }) {
  if (!videoId) {
    return <div style={styles.playerFallback}>Missing YouTube video ID.</div>;
  }

  return (
    <div style={styles.videoWrap}>
      <iframe
        style={styles.iframe}
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
        title="Live Stream"
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
    return <YouTubePlayer videoId={stream.youtubeVideoId} />;
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

export default function EventWatchPage({ event, liveData }) {
  const [selectedStreamId, setSelectedStreamId] = useState(
    liveData?.primaryStream?.id || liveData?.streams?.[0]?.id || ""
  );

  const streams = liveData?.streams || [];

  useEffect(() => {
    if (!selectedStreamId && streams.length > 0) {
      setSelectedStreamId(streams[0].id);
    }
  }, [selectedStreamId, streams]);

  const selectedStream = useMemo(() => {
    return streams.find((stream) => stream.id === selectedStreamId) || streams[0] || null;
  }, [selectedStreamId, streams]);

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

  const locationLabel = [event.venueName, event.city, event.state].filter(Boolean).join(" • ");

  return (
    <>
      <Head>
        <title>{event.title} | MotorXLive</title>
        <meta
          name="description"
          content={event.description || `Watch ${event.title} live on MotorXLive.`}
        />
      </Head>

      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.heroGrid}>
            <div style={styles.mainColumn}>
              <div style={styles.liveHeader}>
                <span style={styles.liveBadge}>LIVE EVENT</span>
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
                <StreamPlayer stream={selectedStream} />
              </div>

              {streams.length > 1 ? (
                <div style={styles.streamSwitcher}>
                  <div style={styles.sectionHeading}>Available Streams</div>
                  <div style={styles.streamTabs}>
                    {streams.map((stream, index) => (
                      <button
                        key={stream.id}
                        type="button"
                        onClick={() => setSelectedStreamId(stream.id)}
                        style={{
                          ...styles.streamTab,
                          ...(selectedStreamId === stream.id ? styles.streamTabActive : {}),
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
                {!event.videos?.length ? (
                  <p style={styles.mutedText}>No videos published yet.</p>
                ) : (
                  <div style={styles.videoList}>
                    {event.videos.map((video) => (
                      <div key={video.id} style={styles.videoRow}>
                        <div>
                          <div style={styles.videoTitle}>{video.title}</div>
                          <div style={styles.videoMeta}>
                            {video.publishedAt ? formatDate(video.publishedAt) : "Unscheduled"}
                          </div>
                        </div>

                        {video.youtubeVideoId ? (
                          <a
                            href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`}
                            target="_blank"
                            rel="noreferrer"
                            style={styles.linkButton}
                          >
                            Watch
                          </a>
                        ) : video.playbackHlsUrl ? (
                          <a
                            href={video.playbackHlsUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={styles.linkButton}
                          >
                            Open
                          </a>
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
                  <li>Use the stream buttons to switch feeds.</li>
                  <li>Refresh if a newly approved stream does not appear immediately.</li>
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
    const [eventRes, liveRes] = await Promise.all([
      fetch(`${baseUrl}/public/events/${slug}`),
      fetch(`${baseUrl}/public/events/${slug}/live`),
    ]);

    const event = await eventRes.json();
    const liveData = await liveRes.json();

    return {
      props: {
        event,
        liveData,
      },
    };
  } catch {
    return {
      props: {
        event: { ok: false },
        liveData: { streams: [] },
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
    border: 0,
  },
  video: {
    width: "100%",
    height: "100%",
    display: "block",
    background: "#000",
  },
  playerFallback: {
    aspectRatio: "16 / 9",
    display: "grid",
    placeItems: "center",
    background: "#0f141a",
    color: "#c9d1d9",
    padding: 20,
    textAlign: "center",
  },
  streamSwitcher: {
    marginTop: 16,
    background: "#11161c",
    border: "1px solid #1f2937",
    borderRadius: 14,
    padding: 16,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 12,
  },
  streamTabs: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  streamTab: {
    background: "#131a22",
    color: "#dbe5f0",
    border: "1px solid #223041",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
  },
  streamTabActive: {
    background: "#1b2a40",
    border: "1px solid #4f8cff",
    color: "#fff",
  },
  infoCard: {
    marginTop: 18,
    background: "#11161c",
    border: "1px solid #1f2937",
    borderRadius: 14,
    padding: 18,
  },
  description: {
    margin: 0,
    color: "#c9d1d9",
    lineHeight: 1.7,
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
  },
  detailLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: "#8fb3ff",
    marginBottom: 6,
  },
  detailValue: {
    color: "#f5f7fa",
  },
  flyerCard: {
    background: "#11161c",
    border: "1px solid #1f2937",
    borderRadius: 14,
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
  linkButton: {
    background: "#2563eb",
    color: "#fff",
    textDecoration: "none",
    borderRadius: 10,
    padding: "10px 14px",
    display: "inline-block",
  },
  videoList: {
    display: "grid",
    gap: 12,
  },
  videoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingBottom: 12,
    borderBottom: "1px solid #1f2937",
  },
  videoTitle: {
    fontWeight: 700,
  },
  videoMeta: {
    color: "#9aa4af",
    fontSize: 14,
    marginTop: 4,
  },
  tipList: {
    margin: 0,
    paddingLeft: 18,
    color: "#c9d1d9",
    lineHeight: 1.6,
  },
  mutedText: {
    color: "#9aa4af",
  },
};