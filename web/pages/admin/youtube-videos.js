import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { adminFetch } from "../../lib/adminFetch";
import { requireAdminPage } from "../../lib/requireAdminPage";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
}

function getSuggestedType(video) {
  if (
    video.liveBroadcastContent === "live" ||
    video.liveBroadcastContent === "upcoming" ||
    video.scheduledStartTime ||
    video.actualStartTime
  ) {
    return "Stream";
  }

  return "Video";
}

export default function AdminYouTubeVideosPage() {
  const [events, setEvents] = useState([]);
  const [videos, setVideos] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");

  const filteredVideos = useMemo(() => {
    if (statusFilter === "ALL") return videos;
    return videos.filter((video) => video.ingestionStatus === statusFilter);
  }, [videos, statusFilter]);

  async function loadEvents() {
    const res = await adminFetch("/api/admin/events");
    const json = await res.json();
    const list = Array.isArray(json) ? json : [];
    setEvents(list);

    if (!selectedEventId && list.length > 0) {
      setSelectedEventId(list[0].id);
    }
  }

  async function loadVideos() {
    try {
      setLoading(true);
      const res = await adminFetch("/api/admin/youtube-discovery/videos");
      const text = await res.text();

      if (!res.ok) throw new Error(text || "Failed to load YouTube videos.");

      const json = text ? JSON.parse(text) : [];
      setVideos(Array.isArray(json) ? json : []);
    } catch (err) {
      setMessage(err.message || "Failed to load YouTube videos.");
      setMessageType("error");
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
    loadVideos();
  }, []);

  async function ingestVideo(videoId) {
    if (!selectedEventId) {
      setMessage("Select an event before ingesting.");
      setMessageType("error");
      return;
    }

    try {
      setBusyId(videoId);
      setMessage("");

      const res = await adminFetch(`/api/admin/youtube-discovery/videos/${videoId}/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: selectedEventId,
        }),
      });

      const text = await res.text();

      if (!res.ok) throw new Error(text || "Failed to ingest video.");

      const json = text ? JSON.parse(text) : null;

      if (json?.ok === false) {
        throw new Error(json.error || "Failed to ingest video.");
      }

      setMessage(
        `Ingested as ${json?.type || "content"} (${json?.action || "saved"}).`
      );
      setMessageType("success");
      await loadVideos();
    } catch (err) {
      setMessage(err.message || "Failed to ingest video.");
      setMessageType("error");
    } finally {
      setBusyId("");
    }
  }

  async function autoIngest() {
    if (!selectedEventId) {
      setMessage("Select an event before auto-ingesting.");
      setMessageType("error");
      return;
    }

    try {
      setBusyId("AUTO");
      setMessage("Running auto-ingest...");
      setMessageType("success");

      const res = await adminFetch("/api/admin/youtube-discovery/auto-ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: selectedEventId,
        }),
      });

      const text = await res.text();

      if (!res.ok) throw new Error(text || "Auto-ingest failed.");

      const json = text ? JSON.parse(text) : null;

      setMessage(`Auto-ingest complete. Attempted ${json?.attempted ?? 0} items.`);
      setMessageType("success");

      await loadVideos();
    } catch (err) {
      setMessage(err.message || "Auto-ingest failed.");
      setMessageType("error");
    } finally {
      setBusyId("");
    }
  }

  return (
    <AdminLayout title="YouTube Discovered Videos">
      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Ingest YouTube Videos</h2>

        <p style={styles.mutedText}>
          Select the MotorXLive event these discovered YouTube items should attach to,
          then ingest them as streams or videos.
        </p>

        <div style={styles.controls}>
          <select
            style={styles.input}
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            <option value="">Select MotorXLive event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>

          <select
            style={styles.input}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="DISCOVERED">Discovered</option>
            <option value="READY_TO_INGEST">Ready to ingest</option>
            <option value="INGESTED">Ingested</option>
            <option value="IGNORED">Ignored</option>
            <option value="FAILED">Failed</option>
          </select>

          <button
            type="button"
            style={{
              ...styles.button,
              ...(busyId === "AUTO" ? styles.buttonDisabled : {}),
            }}
            disabled={busyId === "AUTO"}
            onClick={autoIngest}
          >
            {busyId === "AUTO" ? "Auto-Ingesting..." : "Auto-Ingest Approved Channels"}
          </button>

          <button type="button" style={styles.secondaryButton} onClick={loadVideos}>
            Refresh
          </button>
        </div>

        {message ? (
          <p
            style={{
              ...styles.message,
              ...(messageType === "error" ? styles.errorMessage : {}),
            }}
          >
            {message}
          </p>
        ) : null}
      </section>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Discovered Videos</h2>

        {loading ? <p style={styles.mutedText}>Loading videos...</p> : null}

        {!loading && filteredVideos.length === 0 ? (
          <p style={styles.mutedText}>No discovered videos found.</p>
        ) : null}

        <div style={styles.videoList}>
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              busy={busyId === video.id}
              onIngest={() => ingestVideo(video.id)}
            />
          ))}
        </div>
      </section>
    </AdminLayout>
  );
}

function VideoCard({ video, busy, onIngest }) {
  const suggestedType = getSuggestedType(video);
  const alreadyIngested = video.ingestionStatus === "INGESTED";

  return (
    <div style={styles.videoCard}>
      <div style={styles.videoGrid}>
        <div>
          {video.thumbnailUrl ? (
            <img src={video.thumbnailUrl} alt={video.title} style={styles.thumb} />
          ) : (
            <div style={styles.thumbPlaceholder}>YT</div>
          )}
        </div>

        <div>
          <div style={styles.videoTitle}>{video.title}</div>

          <div style={styles.videoMeta}>
            {video.channel?.title || "Unknown channel"} • Suggested: {suggestedType}
          </div>

          <div style={styles.videoMeta}>
            YouTube status: {video.liveBroadcastContent || "none"} • Ingestion:{" "}
            {video.ingestionStatus}
          </div>

          <div style={styles.videoMeta}>
            Published: {formatDate(video.publishedAt)}
          </div>

          <div style={styles.videoMeta}>
            Scheduled: {formatDate(video.scheduledStartTime)}
          </div>

          {video.watchUrl ? (
            <a href={video.watchUrl} target="_blank" rel="noreferrer" style={styles.link}>
              Watch on YouTube
            </a>
          ) : null}
        </div>

        <div style={styles.actions}>
          <button
            type="button"
            style={{
              ...styles.button,
              ...(busy || alreadyIngested ? styles.buttonDisabled : {}),
            }}
            disabled={busy || alreadyIngested}
            onClick={onIngest}
          >
            {alreadyIngested ? "Ingested" : busy ? "Ingesting..." : `Ingest as ${suggestedType}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = requireAdminPage;

const styles = {
  panel: {
    background: "#11161c",
    border: "1px solid #1f2937",
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 12,
  },
  mutedText: {
    color: "#9aa4af",
    lineHeight: 1.5,
  },
  controls: {
    display: "grid",
    gridTemplateColumns: "1.4fr 0.8fr auto auto",
    gap: 12,
    alignItems: "center",
    marginTop: 16,
  },
  input: {
    width: "100%",
    background: "#0f141a",
    border: "1px solid #2a3647",
    color: "#f5f7fa",
    borderRadius: 10,
    padding: "12px 14px",
  },
  button: {
    background: "#2563eb",
    color: "#fff",
    border: 0,
    borderRadius: 10,
    padding: "12px 14px",
    cursor: "pointer",
  },
  secondaryButton: {
    background: "#1b2a40",
    color: "#fff",
    border: "1px solid #31598b",
    borderRadius: 10,
    padding: "12px 14px",
    cursor: "pointer",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  message: {
    marginTop: 12,
    color: "#8fd19e",
  },
  errorMessage: {
    color: "#ffb4b4",
  },
  videoList: {
    display: "grid",
    gap: 14,
  },
  videoCard: {
    background: "#0f141a",
    border: "1px solid #2a3647",
    borderRadius: 14,
    padding: 14,
  },
  videoGrid: {
    display: "grid",
    gridTemplateColumns: "180px 1fr auto",
    gap: 14,
    alignItems: "center",
  },
  thumb: {
    width: "100%",
    aspectRatio: "16 / 9",
    objectFit: "cover",
    borderRadius: 10,
    background: "#000",
  },
  thumbPlaceholder: {
    width: "100%",
    aspectRatio: "16 / 9",
    borderRadius: 10,
    background: "#1b2a40",
    color: "#8fb3ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },
  videoTitle: {
    color: "#f5f7fa",
    fontWeight: 800,
    marginBottom: 6,
  },
  videoMeta: {
    color: "#9aa4af",
    fontSize: 13,
    marginTop: 4,
  },
  link: {
    color: "#8fb3ff",
    textDecoration: "none",
    fontSize: 13,
    display: "inline-block",
    marginTop: 6,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
  },
};