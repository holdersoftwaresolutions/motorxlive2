import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { adminFetch } from "../../lib/adminFetch";
import { requireAdminPage } from "../../lib/requireAdminPage";

function parseYouTubeUrl(input = "") {
  try {
    const url = new URL(input.trim());

    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace("/", "").trim();
      return id ? { videoId: id } : null;
    }

    if (url.hostname.includes("youtube.com")) {
      if (url.searchParams.get("v")) {
        return { videoId: url.searchParams.get("v") };
      }

      const liveMatch = url.pathname.match(/\/live\/([^/?]+)/);
      if (liveMatch?.[1]) {
        return { videoId: liveMatch[1] };
      }

      const embedMatch = url.pathname.match(/\/embed\/([^/?]+)/);
      if (embedMatch?.[1]) {
        return { videoId: embedMatch[1] };
      }
    }

    return null;
  } catch {
    return null;
  }
}

function fallbackTitleFromYouTubeUrl(input = "") {
  try {
    const url = new URL(input.trim());
    const last = url.pathname.split("/").filter(Boolean).pop();
    return last ? `YouTube Feed ${last}` : "";
  } catch {
    return "";
  }
}

export default function AdminStreamsPage() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [streams, setStreams] = useState([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    sourceType: "YOUTUBE",
    title: "",
    isPrimary: false,
    priority: 0,
    playbackHlsUrl: "",
    playbackDashUrl: "",
    youtubeUrl: "",
    youtubeVideoId: "",
  });

  const isYoutube = form.sourceType === "YOUTUBE";
  const canSubmit = useMemo(() => {
    if (!selectedEventId) return false;
    if (isYoutube) return !!form.youtubeUrl.trim();
    return !!form.playbackHlsUrl.trim() || !!form.playbackDashUrl.trim();
  }, [selectedEventId, isYoutube, form]);

  async function loadEvents() {
    const res = await adminFetch("/api/admin/events");
    const json = await res.json();
    const list = Array.isArray(json) ? json : [];
    setEvents(list);

    if (!selectedEventId && list.length > 0) {
      setSelectedEventId(list[0].id);
    }
  }

  async function loadStreams(eventId) {
    if (!eventId) {
      setStreams([]);
      return;
    }

    const res = await adminFetch(`/api/admin/events/${eventId}/streams`);
    const json = await res.json();
    setStreams(Array.isArray(json) ? json : []);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) loadStreams(selectedEventId);
  }, [selectedEventId]);

  function resetForm() {
    setForm({
      sourceType: "YOUTUBE",
      title: "",
      isPrimary: false,
      priority: 0,
      playbackHlsUrl: "",
      playbackDashUrl: "",
      youtubeUrl: "",
      youtubeVideoId: "",
    });
  }

  function handleYouTubeUrlChange(value) {
    const parsed = parseYouTubeUrl(value);
    const nextVideoId = parsed?.videoId || "";
    const nextFallbackTitle = form.title || fallbackTitleFromYouTubeUrl(value);

    setForm((s) => ({
      ...s,
      youtubeUrl: value,
      youtubeVideoId: nextVideoId,
      title: s.title || nextFallbackTitle,
    }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setMessage("");

    if (!selectedEventId) {
      setMessage("Select an event first.");
      return;
    }

    const payload = {
      sourceType: form.sourceType,
      title: form.title.trim() || undefined,
      isPrimary: form.isPrimary,
      priority: Number(form.priority || 0),
      youtubeUrl: isYoutube ? form.youtubeUrl.trim() : undefined,
      youtubeVideoId: isYoutube ? form.youtubeVideoId.trim() : undefined,
      playbackHlsUrl: !isYoutube ? form.playbackHlsUrl.trim() || undefined : undefined,
      playbackDashUrl: !isYoutube ? form.playbackDashUrl.trim() || undefined : undefined,
    };

    const res = await adminFetch(`/api/admin/events/${selectedEventId}/streams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setMessage("Failed to create stream.");
      return;
    }

    setMessage("Stream created.");
    resetForm();
    loadStreams(selectedEventId);
  }

  async function updateStream(id, patch) {
    const res = await adminFetch(`/api/admin/streams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      setMessage("Failed to update stream.");
      return;
    }

    setMessage("Stream updated.");
    loadStreams(selectedEventId);
  }

  return (
    <AdminLayout title="Streams">
      <div style={styles.grid}>
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Create Stream</h2>

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
            <select
              style={styles.input}
              value={form.sourceType}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  sourceType: e.target.value,
                  playbackHlsUrl: "",
                  playbackDashUrl: "",
                  youtubeUrl: "",
                  youtubeVideoId: "",
                }))
              }
            >
              <option value="YOUTUBE">YOUTUBE</option>
              <option value="EXTERNAL_HLS">EXTERNAL_HLS</option>
            </select>

            {isYoutube ? (
              <>
                <input
                  style={styles.input}
                  placeholder="YouTube URL"
                  value={form.youtubeUrl}
                  onChange={(e) => handleYouTubeUrlChange(e.target.value)}
                />

                <input
                  style={styles.input}
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                />

                <div style={styles.helperText}>
                  Parsed YouTube Video ID: <strong>{form.youtubeVideoId || "—"}</strong>
                </div>
              </>
            ) : (
              <>
                <input
                  style={styles.input}
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
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
              </>
            )}

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

            <button
              type="submit"
              style={{ ...styles.button, ...(canSubmit ? {} : styles.buttonDisabled) }}
              disabled={!canSubmit}
            >
              Create Stream
            </button>
          </form>

          {message ? <p style={styles.message}>{message}</p> : null}
        </section>

        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Event Streams</h2>

          <div style={styles.list}>
            {streams.map((stream) => (
              <StreamRow key={stream.id} stream={stream} onSave={updateStream} />
            ))}

            {streams.length === 0 ? (
              <p style={styles.mutedText}>No streams for this event yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function StreamRow({ stream, onSave }) {
  const isYoutube = stream.sourceType === "YOUTUBE";

  const [draft, setDraft] = useState({
    title: stream.title || "",
    isPrimary: !!stream.isPrimary,
    priority: stream.priority ?? 0,
    playbackHlsUrl: stream.playbackHlsUrl || "",
    playbackDashUrl: stream.playbackDashUrl || "",
    youtubeVideoId: stream.youtubeVideoId || "",
  });

  return (
    <div style={styles.rowCard}>
      <input
        style={styles.input}
        value={draft.title}
        onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))}
      />

      <input
        style={styles.input}
        type="number"
        value={draft.priority}
        onChange={(e) => setDraft((s) => ({ ...s, priority: Number(e.target.value) }))}
      />

      {isYoutube ? (
        <input
          style={styles.input}
          placeholder="YouTube Video ID"
          value={draft.youtubeVideoId}
          onChange={(e) => setDraft((s) => ({ ...s, youtubeVideoId: e.target.value }))}
        />
      ) : (
        <>
          <input
            style={styles.input}
            placeholder="Playback HLS URL"
            value={draft.playbackHlsUrl}
            onChange={(e) => setDraft((s) => ({ ...s, playbackHlsUrl: e.target.value }))}
          />
          <input
            style={styles.input}
            placeholder="Playback DASH URL"
            value={draft.playbackDashUrl}
            onChange={(e) => setDraft((s) => ({ ...s, playbackDashUrl: e.target.value }))}
          />
        </>
      )}

      <label style={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={draft.isPrimary}
          onChange={(e) => setDraft((s) => ({ ...s, isPrimary: e.target.checked }))}
        />
        Primary
      </label>

      <button style={styles.secondaryButton} onClick={() => onSave(stream.id, draft)}>
        Save
      </button>
    </div>
  );
}

export const getServerSideProps = requireAdminPage;

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
  helperText: {
    fontSize: 13,
    color: "#9aa4af",
  },
  checkboxRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    color: "#dbe5f0",
    fontSize: 14,
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
  mutedText: {
    color: "#9aa4af",
  },
};