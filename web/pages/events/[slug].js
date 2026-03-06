import { useEffect, useState } from "react";
import Head from "next/head";

function Player({ stream }) {
  if (!stream) {
    return (
      <div
        style={{
          background: "#111",
          color: "#fff",
          borderRadius: 12,
          minHeight: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        No live stream is currently available.
      </div>
    );
  }

  if (stream.youtubeVideoId) {
    return (
      <div style={{ aspectRatio: "16 / 9", background: "#000", borderRadius: 12, overflow: "hidden" }}>
        <iframe
          title={stream.title || "Live Stream"}
          src={`https://www.youtube.com/embed/${stream.youtubeVideoId}`}
          style={{ width: "100%", height: "100%", border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  if (stream.playbackHlsUrl) {
    return (
      <video
        controls
        playsInline
        style={{ width: "100%", borderRadius: 12, background: "#000" }}
        src={stream.playbackHlsUrl}
      />
    );
  }

  if (stream.playbackDashUrl) {
    return (
      <video
        controls
        playsInline
        style={{ width: "100%", borderRadius: 12, background: "#000" }}
        src={stream.playbackDashUrl}
      />
    );
  }

  return (
    <div
      style={{
        background: "#111",
        color: "#fff",
        borderRadius: 12,
        minHeight: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      This stream does not have a playable source yet.
    </div>
  );
}

export default function EventWatchPage({ slug }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeStreamIndex, setActiveStreamIndex] = useState(0);

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
      } catch (err) {
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

  if (loading) {
    return (
      <div style={{ padding: 32, fontFamily: "system-ui" }}>
        <p>Loading event...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: 32, fontFamily: "system-ui" }}>
        <h1>Event Not Available</h1>
        <p>{error || "Unable to load this event."}</p>
      </div>
    );
  }

  const streams = data.streams || [];
  const activeStream = streams[activeStreamIndex] || streams[0] || null;
  const videos = data.videos || [];

  return (
    <>
      <Head>
        <title>{data.title} | MotorXLive</title>
        <meta name="description" content={data.description || data.title} />
      </Head>

      <div style={{ minHeight: "100vh", background: "#0b0d10", color: "#f5f7fa", fontFamily: "system-ui" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: 32 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 32 }}>
            <div>
              <p style={{ color: "#8fb3ff", textTransform: "uppercase", letterSpacing: 1, fontSize: 13 }}>
                {data.category?.name || "Event"}
              </p>
              <h1 style={{ fontSize: 40, margin: "8px 0 12px" }}>{data.title}</h1>
              {data.description ? (
                <p style={{ color: "#c9d1d9", lineHeight: 1.6 }}>{data.description}</p>
              ) : null}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", color: "#9aa4af", fontSize: 14, marginTop: 12 }}>
                {data.startAt ? <span>{new Date(data.startAt).toLocaleString()}</span> : null}
                {data.endAt ? <span>Ends: {new Date(data.endAt).toLocaleString()}</span> : null}
              </div>
            </div>

            {data.flyerUrl ? (
              <div>
                <img
                  src={data.flyerUrl}
                  alt={`${data.title} flyer`}
                  style={{ width: "100%", borderRadius: 16, display: "block" }}
                />
              </div>
            ) : null}
          </div>

          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, marginBottom: 16 }}>Watch Live</h2>
            <Player stream={activeStream} />
          </section>

          {streams.length > 0 ? (
            <section style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 24, marginBottom: 16 }}>Available Live Feeds</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                {streams.map((stream, index) => (
                  <button
                    key={stream.id}
                    onClick={() => setActiveStreamIndex(index)}
                    style={{
                      textAlign: "left",
                      borderRadius: 12,
                      border: index === activeStreamIndex ? "1px solid #4f8cff" : "1px solid #243041",
                      background: index === activeStreamIndex ? "#162235" : "#121922",
                      color: "#f5f7fa",
                      padding: 14,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                      {stream.title || "Untitled Feed"}
                    </div>
                    <div style={{ fontSize: 13, color: "#9aa4af" }}>
                      {stream.provider || "custom"} · {stream.lifecycle || "READY"}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 style={{ fontSize: 24, marginBottom: 16 }}>Event Library</h2>
            {videos.length === 0 ? (
              <p style={{ color: "#9aa4af" }}>No completed videos available yet.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
                {videos.map((video) => (
                  <div
                    key={video.id}
                    style={{
                      border: "1px solid #1f2937",
                      background: "#11161c",
                      borderRadius: 14,
                      padding: 16,
                    }}
                  >
                    <h3 style={{ margin: "0 0 10px", fontSize: 18 }}>{video.title}</h3>
                    {video.description ? (
                      <p style={{ margin: "0 0 12px", color: "#c9d1d9", fontSize: 14, lineHeight: 1.5 }}>
                        {video.description}
                      </p>
                    ) : null}

                    {video.youtubeVideoId ? (
                      <a
                        href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-block",
                          textDecoration: "none",
                          background: "#2563eb",
                          color: "#fff",
                          padding: "10px 14px",
                          borderRadius: 10,
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        Watch on YouTube
                      </a>
                    ) : video.playbackHlsUrl ? (
                      <a
                        href={video.playbackHlsUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-block",
                          textDecoration: "none",
                          background: "#2563eb",
                          color: "#fff",
                          padding: "10px 14px",
                          borderRadius: 10,
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        Open HLS Video
                      </a>
                    ) : video.playbackDashUrl ? (
                      <a
                        href={video.playbackDashUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-block",
                          textDecoration: "none",
                          background: "#2563eb",
                          color: "#fff",
                          padding: "10px 14px",
                          borderRadius: 10,
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        Open DASH Video
                      </a>
                    ) : (
                      <span style={{ color: "#9aa4af" }}>No playback URL available</span>
                    )}
                  </div>
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