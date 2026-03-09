import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { adminFetch } from "../../lib/adminFetch";

export default function AdminVideosPage() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [videos, setVideos] = useState([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    sourceType: "YOUTUBE",
    provider: "custom",
    title: "",
    description: "",
    playbackHlsUrl: "",
    playbackDashUrl: "",
    youtubeVideoId: "",
    durationSeconds: "",
    status: "READY",
    publishedAt: "",
  });

  async function loadEvents() {
    const res = await adminFetch("/api/admin/events");
    const json = await res.json();
    const list = Array.isArray(json) ? json : [];
    setEvents(list);

    if (!selectedEventId && list.length > 0) {
      setSelectedEventId(list[0].id);
    }
  }

  async function loadVideos(eventId) {
    if (!eventId) {
      setVideos([]);
      return;
    }

    const res = await adminFetch(`/api/admin/events/${eventId}/videos`);
    const json = await res.json();
    setVideos(Array.isArray(json) ? json : []);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) loadVideos(selectedEventId);
  }, [selectedEventId]);

  async function handleCreate(e) {
    e.preventDefault();
    setMessage("");

    if (!selectedEventId) {
      setMessage("Select an event first.");
      return;
    }

    const res = await adminFetch(`/api/admin/events/${selectedEventId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        durationSeconds: form.durationSeconds ? Number(form.durationSeconds) : undefined,
        publishedAt: form.publishedAt || undefined,
      }),
    });

    if (!res.ok) {
      setMessage("Failed to create video.");
      return;
    }

    setMessage("Video created.");
    setForm({
      sourceType: "YOUTUBE",
      provider: "custom",
      title: "",
      description: "",
      playbackHlsUrl: "",
      playbackDashUrl: "",
      youtubeVideoId: "",
      durationSeconds: "",
      status: "READY",
      publishedAt: "",
    });
    loadVideos(selectedEventId);
  }

  async function updateVideo(id, patch) {
    const res = await adminFetch(`/api/admin/videos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      setMessage("Failed to update video.");
      return;
    }

    setMessage("Video updated.");
    loadVideos(selectedEventId);
  }

  return (
    <AdminLayout title="Videos">
      <div style={styles.grid}>
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Create Video</h2>

          <div style={{ marginBottom: 12 }}>
            <select
              style={styles.input}
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              <option value="">Select event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleCreate} style={styles.form}>
            <select style={styles.input} value={form.sourceType} onChange={(e) => setForm((s) => ({ ...s, sourceType: e.target.value }))}>
              <option value="YOUTUBE">YOUTUBE</option>
              <option value="EXTERNAL_HLS">EXTERNAL_HLS</option>
              <option value="MANAGED_VOD">MANAGED_VOD</option>
            </select>

            <input style={styles.input} placeholder="Provider" value={form.provider} onChange={(e) => setForm((s) => ({ ...s, provider: e.target.value }))} />
            <input style={styles.input} placeholder="Title" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
            <textarea style={styles.textarea} placeholder="Description" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
            <input style={styles.input} placeholder="YouTube Video ID" value={form.youtubeVideoId} onChange={(e) => setForm((s) => ({ ...s, youtubeVideoId: e.target.value }))} />
            <input style={styles.input} placeholder="Playback HLS URL" value={form.playbackHlsUrl} onChange={(e) => setForm((s) => ({ ...s, playbackHlsUrl: e.target.value }))} />
            <input style={styles.input} placeholder="Playback DASH URL" value={form.playbackDashUrl} onChange={(e) => setForm((s) => ({ ...s, playbackDashUrl: e.target.value }))} />
            <input style={styles.input} type="number" placeholder="Duration Seconds" value={form.durationSeconds} onChange={(e) => setForm((s) => ({ ...s, durationSeconds: e.target.value }))} />
            <input style={styles.input} type="datetime-local" value={form.publishedAt} onChange={(e) => setForm((s) => ({ ...s, publishedAt: e.target.value }))} />

            <select style={styles.input} value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}>
              <option value="PROCESSING">PROCESSING</option>
              <option value="READY">READY</option>
              <option value="FAILED">FAILED</option>
              <option value="DISABLED">DISABLED</option>
            </select>

            <button type="submit" style={styles.button}>Create Video</button>
          </form>

          {message ? <p style={styles.message}>{message}</p> : null}
        </section>

        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Event Videos</h2>

          <div style={styles.list}>
            {videos.map((video) => (
              <VideoRow key={video.id} video={video} onSave={updateVideo} />
            ))}

            {videos.length === 0 ? (
              <p style={styles.mutedText}>No videos for this event yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function VideoRow({ video, onSave }) {
  const [draft, setDraft] = useState({
    title: video.title || "",
    description: video.description || "",
    youtubeVideoId: video.youtubeVideoId || "",
    playbackHlsUrl: video.playbackHlsUrl || "",
    playbackDashUrl: video.playbackDashUrl || "",
    status: video.status || "READY",
  });

  return (
    <div style={styles.rowCard}>
      <input style={styles.input} value={draft.title} onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))} />
      <textarea style={styles.textarea} value={draft.description} onChange={(e) => setDraft((s) => ({ ...s, description: e.target.value }))} />
      <input style={styles.input} placeholder="YouTube Video ID" value={draft.youtubeVideoId} onChange={(e) => setDraft((s) => ({ ...s, youtubeVideoId: e.target.value }))} />
      <input style={styles.input} placeholder="Playback HLS URL" value={draft.playbackHlsUrl} onChange={(e) => setDraft((s) => ({ ...s, playbackHlsUrl: e.target.value }))} />
      <select style={styles.input} value={draft.status} onChange={(e) => setDraft((s) => ({ ...s, status: e.target.value }))}>
        <option value="PROCESSING">PROCESSING</option>
        <option value="READY">READY</option>
        <option value="FAILED">FAILED</option>
        <option value="DISABLED">DISABLED</option>
      </select>
      <button style={styles.secondaryButton} onClick={() => onSave(video.id, draft)}>Save</button>
    </div>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1.2fr",
    gap: 20,
  },
  panel: {
    background: "#11161c",
    border: "1px solid #1f2937",
    borderRadius: 14,
    padding: 18,
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 14,
  },
  form: {
    display: "grid",
    gap: 12,
  },
  list: {
    display: "grid",
    gap: 12,
  },
  rowCard: {
    display: "grid",
    gap: 10,
  },
  input: {
    width: "100%",
    background: "#0f141a",
    border: "1px solid #2a3647",
    color: "#f5f7fa",
    borderRadius: 10,
    padding: "12px 14px",
  },
  textarea: {
    width: "100%",
    minHeight: 80,
    background: "#0f141a",
    border: "1px solid #2a3647",
    color: "#f5f7fa",
    borderRadius: 10,
    padding: "12px 14px",
    resize: "vertical",
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
  message: {
    marginTop: 12,
    color: "#8fd19e",
  },
  mutedText: {
    color: "#9aa4af",
  },
};