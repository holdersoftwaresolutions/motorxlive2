import { useEffect, useState } from "react";
import ContributorLayout from "../../components/ContributorLayout";
import { requireContributorPage } from "../../lib/requireContributorPage";

export default function ContributorStreamsPage({ currentUser }) {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [message, setMessage] = useState("");
  const [myStreams, setMyStreams] = useState([]);

  const [form, setForm] = useState({
    sourceType: "YOUTUBE",
    title: "",
    isPrimary: false,
    priority: 0,
    youtubeVideoId: "",
    playbackHlsUrl: "",
    playbackDashUrl: "",
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

  async function loadMyStreams(eventId) {
    if (!eventId) {
      setMyStreams([]);
      return;
    }

    const res = await fetch(`/api/contributor/events/${eventId}/streams`, {
      credentials: "include",
    });
    const json = await parse(res);
    setMyStreams(Array.isArray(json) ? json : []);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) loadMyStreams(selectedEventId);
  }, [selectedEventId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    const res = await fetch(`/api/contributor/events/${selectedEventId}/streams`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        priority: Number(form.priority || 0),
      }),
    });

    const json = await parse(res);

    if (!res.ok || json?.ok === false) {
      setMessage(json?.error || "Failed to submit stream.");
      return;
    }

    setMessage("Stream submitted for review.");
    setForm({
      sourceType: "YOUTUBE",
      title: "",
      isPrimary: false,
      priority: 0,
      youtubeVideoId: "",
      playbackHlsUrl: "",
      playbackDashUrl: "",
    });
    loadMyStreams(selectedEventId);
  }

  return (
    <ContributorLayout title="Streams">
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
            placeholder="Stream title"
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
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
            placeholder="Priority"
            value={form.priority}
            onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value }))}
          />

          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={form.isPrimary}
              onChange={(e) => setForm((s) => ({ ...s, isPrimary: e.target.checked }))}
            />
            Primary stream
          </label>

          <button type="submit" style={styles.button}>
            Submit Stream
          </button>
        </form>

        {message ? <p style={styles.message}>{message}</p> : null}
      </div>

      <div style={styles.panel}>
        <h2 style={styles.sectionTitle}>My Submitted Streams</h2>
        {myStreams.length === 0 ? (
          <p style={styles.muted}>No submitted streams yet.</p>
        ) : (
          <div style={styles.list}>
            {myStreams.map((stream) => (
              <div key={stream.id} style={styles.row}>
                <strong>{stream.title || "Untitled Stream"}</strong>
                <span>{stream.lifecycle}</span>
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
  checkboxRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
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