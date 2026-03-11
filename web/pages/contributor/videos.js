import { useEffect, useState } from "react";
import ContributorLayout from "../../components/ContributorLayout";
import { requireContributorPage } from "../../lib/requireContributorPage";

export default function ContributorVideosPage({ currentUser }) {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [message, setMessage] = useState("");
  const [myVideos, setMyVideos] = useState([]);

  const [form, setForm] = useState({
    sourceType: "YOUTUBE",
    title: "",
    description: "",
    youtubeVideoId: "",
    playbackHlsUrl: "",
    playbackDashUrl: "",
    durationSeconds: "",
    publishedAt: "",
  });

  async function parse(res) {
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async function loadEvents() {
    const res = await fetch("/api/admin/events", { credentials: "include" });
    const json = await parse(res);
    setEvents(Array.isArray(json) ? json : []);
    if (!selectedEventId && Array.isArray(json) && json.length > 0) {
      setSelectedEventId(json[0].id);
    }
  }

  async function loadMyVideos(eventId) {
    if (!eventId) {
      setMyVideos([]);
      return;
    }

    const res = await fetch(`/api/contributor/events/${eventId}/videos`, {
      credentials: "include",
    });
    const json = await parse(res);
    setMyVideos(Array.isArray(json) ? json : []);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) loadMyVideos(selectedEventId);
  }, [selectedEventId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    const res = await fetch(`/api/contributor/events/${selectedEventId}/videos`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        durationSeconds: form.durationSeconds
          ? Number(form.durationSeconds)
          : undefined,
        publishedAt: form.publishedAt || undefined,
      }),
    });

    const json = await parse(res);

    if (!res.ok || json?.ok === false) {
      setMessage(json?.error || "Failed to submit video.");
      return;
    }

    setMessage("Video submitted for review.");
    setForm({
      sourceType: "YOUTUBE",
      title: "",
      description: "",
      youtubeVideoId: "",
      playbackHlsUrl: "",
      playbackDashUrl: "",
      durationSeconds: "",
      publishedAt: "",
    });
    loadMyVideos(selectedEventId);
  }

  return (
    <ContributorLayout title="Videos">
      <p style={styles.subtitle}>
        Signed in as <strong>{currentUser?.email}</strong>.
      </p>

      <div style={styles.panel}>
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

        <form onSubmit={handleSubmit} style={styles.form}>
          <select
            style={styles.input}
            value={form.sourceType}
            onChange={(e) => setForm((s) => ({ ...s, sourceType: e.target.value }))}
          >
            <option value="YOUTUBE">YOUTUBE</option>
            <option value="EXTERNAL_HLS">EXTERNAL_HLS</option>
          </select>

          <input
            style={styles.input}
            placeholder="Video title"
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
          />

          <textarea
            style={styles.textarea}
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
          />

          <input
            style={styles.input}
            placeholder="YouTube Video ID"
            value={form.youtubeVideoId}
            onChange={(e) => setForm((s) => ({ ...s, youtubeVideoId: e.target.value }))}
          />

          <input
            style={styles.input}
            placeholder="Playback HLS URL"
            value={form.playbackHlsUrl}
            onChange={(e) => setForm((s) => ({ ...s, playbackHlsUrl: e.target.value }))}
          />

          <input
            style={styles.input}
            placeholder="Playback DASH URL"
            value={form.playbackDashUrl}
            onChange={(e) => setForm((s) => ({ ...s, playbackDashUrl: e.target.value }))}
          />

          <input
            style={styles.input}
            type="number"
            placeholder="Duration Seconds"
            value={form.durationSeconds}
            onChange={(e) => setForm((s) => ({ ...s, durationSeconds: e.target.value }))}
          />

          <input
            style={styles.input}
            type="datetime-local"
            value={form.publishedAt}
            onChange={(e) => setForm((s) => ({ ...s, publishedAt: e.target.value }))}
          />

          <button type="submit" style={styles.button}>
            Submit Video
          </button>
        </form>

        {message ? <p style={styles.message}>{message}</p> : null}
      </div>

      <div style={styles.panel}>
        <h2 style={styles.sectionTitle}>My Submitted Videos</h2>
        {myVideos.length === 0 ? (
          <p style={styles.muted}>No submitted videos yet.</p>
        ) : (
          <div style={styles.list}>
            {myVideos.map((video) => (
              <div key={video.id} style={styles.row}>
                <strong>{video.title}</strong>
                <span>{video.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ContributorLayout>
  );
}

export const getServerSideProps = requireContributorPage;

const styles = {
  subtitle: {
    margin: "0 0 18px",
    color: "#c9d1d9",
  },
  panel: {
    background: "#11161c",
    border: "1px solid #1f2937",
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
  },
  form: {
    display: "grid",
    gap: 12,
    marginTop: 12,
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
    minHeight: 90,
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
  message: {
    color: "#8fd19e",
  },
  muted: {
    color: "#9aa4af",
  },
  sectionTitle: {
    marginTop: 0,
  },
  list: {
    display: "grid",
    gap: 10,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 0",
    borderBottom: "1px solid #1f2937",
  },
};