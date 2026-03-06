import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Hls from "hls.js";

function getYouTubeEmbedUrl(videoId) {
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}`;
}

function pickPrimaryStream(streams) {
  if (!streams || streams.length === 0) return null;
  const primary = streams.find((s) => s.isPrimary);
  return primary || streams[0];
}

function HlsPlayer({ src }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src;
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      style={styles.video}
    />
  );
}

function StreamPlayer({ stream }) {
  if (!stream) {
    return (
      <div style={styles.emptyPlayer}>
        <p style={styles.emptyPlayerText}>No live stream is currently available.</p>
      </div>
    );
  }

  if (stream.youtubeVideoId) {
    return (
      <div style={styles.playerWrap}>
        <iframe
          title={stream.title || "Live Stream"}
          src={getYouTubeEmbedUrl(stream.youtubeVideoId)}
          style={styles.iframe}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  if (stream.playbackHlsUrl) {
    return (
      <div style={styles.playerWrap}>
        <HlsPlayer src={stream.playbackHlsUrl} />
      </div>
    );
  }

  if (stream.playbackDashUrl) {
    return (
      <div style={styles.playerWrap}>
        <video
          controls
          playsInline
          style={styles.video}
          src={stream.playbackDashUrl}
        />
      </div>
    );
  }

  return (
    <div style={styles.emptyPlayer}>
      <p style={styles.emptyPlayerText}>This stream does not have a playable source yet.</p>
    </div>
  );
}

function VideoCard({ video }) {
  return (
    <div style={styles.videoCard}>
      <div style={styles.videoCardBody}>
        <h3 style={styles.videoTitle}>{video.title}</h3>
        {video.description ? <p style={styles.videoDescription}>{video.description}</p> : null}

        {video.youtubeVideoId ? (
          <a
            href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`}
            target="_blank"
            rel="noreferrer"
            style={styles.linkButton}
          >
            Watch on YouTube
          </a>
        ) : video.playbackHlsUrl ? (
          <a href={video.playbackHlsUrl} target="_blank" rel="noreferrer" style={styles.linkButton}>
            Open HLS Video
          </a>
        ) : video.playbackDashUrl ? (
          <a href={video.playbackDashUrl} target="_blank" rel="noreferrer" style={styles.linkButton}>
            Open DASH Video
          </a>
        ) : (
          <span style={styles.mutedText}>No playback URL available</span>
        )}
      </div>
    </div>
  );
}

export default function EventWatchPage({ slug }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeStreamId, setActiveStreamId] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/public/events/${slug}/live`);
        const json = await res.json();

        if (!mounted) return;

        if (!res.ok || json?.ok === false) {
          setError(json?.error || "Failed to load event");
          setData(null);
          return;
        }

        setData(json);

        const primary = pickPrimaryStream(json?.streams || []);
        setActiveStreamId(primary?.id || null);
      } catch {
        if (!mounted) return;
        setError("Failed to load event");
        setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [slug]);

  const activeStream = useMemo(() => {
    if (!data?.streams?.length) return null;
    return data.streams.find((s) => s.id === activeStreamId) || pickPrimaryStream(data.streams);
  }, [data, activeStreamId]);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <p>Loading event...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.pageTitle}>Event Not Available</h1>
          <p style={styles.errorText}>{error || "Unable to load this event."}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{data.title} | MotorXLive</title>
        <meta name="description" content={data.description || data.title} />
      </Head>

      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <div style={styles.headerCopy}>
              <p style={styles.eyebrow}>{data.category?.name || "Event"}</p>
              <h1 style={styles.pageTitle}>{data.title}</h1>
              {data.description ? <p style={styles.description}>{data.description}</p> : null}
              <div style={styles.metaRow}>
                {data.startAt ? <span>{new Date(data.startAt).toLocaleString()}</span> : null}
                {data.endAt ? <span>Ends: {new Date(data.endAt).toLocaleString()}</span> : null}
              </div>
            </div>

            {data.flyerUrl ? (
              <div style={styles.flyerWrap}>
                <img src={data.flyerUrl} alt={`${data.title} flyer`} style={styles.flyerImage} />
              </div>
            ) : null}
          </div>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Watch Live</h2>
            <StreamPlayer stream={activeStream} />
          </section>

          {data.streams?.length ? (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Available Live Feeds</h2>
              <div style={styles.streamGrid}>
                {data.streams.map((stream) => {
                  const active = stream.id === activeStream?.id;

                  return (
                    <button
                      key={stream.id}
                      onClick={() => setActiveStreamId(stream.id)}
                      style={{
                        ...styles.streamButton,
                        ...(active ? styles.streamButtonActive : {}),
                      }}
                    >
                      <div style={styles.streamButtonTitle}>
                        {stream.title || "Untitled Feed"}
                      </div>
                      <div style={styles.streamMeta}>
                        {stream.provider || "custom"} · {stream.lifecycle || "READY"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Event Library</h2>

            {!data.videos || data.videos.length === 0 ? (
              <p style={styles.mutedText}>No completed videos available yet.</p>
            ) : (
              <div style={styles.videoGrid}>
                {data.videos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  return {
    props: {
      slug: context.params.slug,
    },
  };
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0b0d10",
    color: "#f5f7fa",
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "32px 20px 60px",
  },
  header: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 24,
    alignItems: "start",
    marginBottom: 32,
  },
  headerCopy: {},
  eyebrow: {
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#8fb3ff",
    marginBottom: 10,
  },
  pageTitle: {
    fontSize: 40,
    lineHeight: 1.1,
    margin: "0 0 12px",
  },
  description: {
    fontSize: 16,
    lineHeight: 1.6,
    color: "#c9d1d9",
    marginBottom: 14,
  },
  metaRow: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    color: "#9aa4af",
    fontSize: 14,
  },
  flyerWrap: {
    width: "100%",
  },
  flyerImage: {
    width: "100%",
    borderRadius: 16,
    display: "block",
    objectFit: "cover",
    background: "#161b22",
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 24,
    marginBottom: 16,
  },
  playerWrap: {
    width: "100%",
    background: "#000",
    borderRadius: 16,
    overflow: "hidden",
    aspectRatio: "16 / 9",
    border: "1px solid #1f2937",
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: 0,
  },
  video: {
    width: "100%",
    height: "100%",
    background: "#000",
  },
  emptyPlayer: {
    borderRadius: 16,
    border: "1px solid #1f2937",
    background: "#11161c",
    aspectRatio: "16 / 9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyPlayerText: {
    color: "#9aa4af",
    fontSize: 16,
  },
  streamGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  streamButton: {
    textAlign: "left",
    borderRadius: 12,
    border: "1px solid #243041",
    background: "#121922",
    color: "#f5f7fa",
    padding: 14,
    cursor: "pointer",
  },
  streamButtonActive: {
    border: "1px solid #4f8cff",
    background: "#162235",
  },
  streamButtonTitle: {
    fontSize: 15,
    fontWeight: 600,
    marginBottom: 6,
  },
  streamMeta: {
    fontSize: 13,
    color: "#9aa4af",
  },
  videoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
  },
  videoCard: {
    border: "1px solid #1f2937",
    background: "#11161c",
    borderRadius: 14,
    overflow: "hidden",
  },
  videoCardBody: {
    padding: 16,
  },
  videoTitle: {
    margin: "0 0 10px",
    fontSize: 18,
  },
  videoDescription: {
    margin: "0 0 12px",
    color: "#c9d1d9",
    fontSize: 14,
    lineHeight: 1.5,
  },
  linkButton: {
    display: "inline-block",
    textDecoration: "none",
    background: "#2563eb",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
  },
  mutedText: {
    color: "#9aa4af",
  },
  errorText: {
    color: "#ff9b9b",
  },
};