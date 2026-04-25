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
      const fromQuery = url.searchParams.get("v");
      if (fromQuery) return { videoId: fromQuery };

      const liveMatch = url.pathname.match(/\/live\/([^/?]+)/);
      if (liveMatch?.[1]) return { videoId: liveMatch[1] };

      const embedMatch = url.pathname.match(/\/embed\/([^/?]+)/);
      if (embedMatch?.[1]) return { videoId: embedMatch[1] };
    }

    return null;
  } catch {
    return null;
  }
}

async function autofillYouTube(url) {
  const res = await fetch("/api/youtube/autofill", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || "Could not load YouTube metadata.");
  }

  return text ? JSON.parse(text) : null;
}

const emptyForm = {
  sourceType: "YOUTUBE",
  provider: "YouTube",
  title: "",
  isPrimary: false,
  priority: 0,
  playbackHlsUrl: "",
  playbackDashUrl: "",
  youtubeUrl: "",
  youtubeVideoId: "",
  sourceUrl: "",
  embedUrl: "",
  youtubeChannelId: "",
  youtubeChannelName: "",
  youtubeThumbnailUrl: "",
  youtubeEmbeddable: null,
  youtubeLiveStatus: "",
};

export default function AdminStreamsPage() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [streams, setStreams] = useState([]);
  const [message, setMessage] = useState("");
  const [loadingYouTube, setLoadingYouTube] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const isYoutube = form.sourceType === "YOUTUBE";

  const canSubmit = useMemo(() => {
    if (!selectedEventId) return false;
    if (loadingYouTube) return false;

    if (isYoutube) {
      return !!form.youtubeUrl.trim() && !!form.youtubeVideoId.trim();
    }

    return !!form.playbackHlsUrl.trim() || !!form.playbackDashUrl.trim();
  }, [selectedEventId, loadingYouTube, isYoutube, form]);

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
    setForm(emptyForm);
  }

  async function handleYouTubeUrlChange(value) {
    const parsed = parseYouTubeUrl(value);

    setForm((prev) => ({
      ...prev,
      youtubeUrl: value,
      youtubeVideoId: parsed?.videoId || "",
    }));

    if (!value.trim() || !parsed?.videoId) return;

    try {
      setLoadingYouTube(true);
      setMessage("Loading YouTube details...");

      const data = await autofillYouTube(value);

      setForm((prev) => ({
        ...prev,
        title: data?.title || prev.title,
        provider: "YouTube",
        sourceType: "YOUTUBE",
        sourceUrl: data?.watchUrl || value,
        embedUrl: data?.embedUrl || "",
        youtubeVideoId: data?.videoId || parsed.videoId,
        youtubeChannelId: data?.channelId || "",
        youtubeChannelName: data?.channelTitle || "",
        youtubeThumbnailUrl: data?.thumbnailUrl || "",
        youtubeEmbeddable:
          data?.embeddable === undefined ? prev.youtubeEmbeddable : data.embeddable,
        youtubeLiveStatus: data?.liveBroadcastContent || "",
      }));

      setMessage("YouTube details loaded.");
    } catch (err) {
      setMessage(err.message || "Could not load YouTube metadata.");
    } finally {
      setLoadingYouTube(false);
    }
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
      provider: isYoutube ? "YouTube" : "custom",
      title: form.title.trim() || undefined,
      isPrimary: form.isPrimary,
      priority: Number(form.priority || 0),

      youtubeUrl: isYoutube ? form.youtubeUrl.trim() : undefined,
      youtubeVideoId: isYoutube ? form.youtubeVideoId.trim() || undefined : undefined,
      sourceUrl: isYoutube ? form.sourceUrl || form.youtubeUrl : undefined,
      embedUrl: isYoutube ? form.embedUrl || undefined : undefined,
      youtubeChannelId: isYoutube ? form.youtubeChannelId || undefined : undefined,
      youtubeChannelName: isYoutube ? form.youtubeChannelName || undefined : undefined,
      youtubeThumbnailUrl: isYoutube ? form.youtubeThumbnailUrl || undefined : undefined,
      youtubeEmbeddable: isYoutube ? form.youtubeEmbeddable : undefined,
      youtubeLiveStatus: isYoutube ? form.youtubeLiveStatus || undefined : undefined,

      playbackHlsUrl: !isYoutube ? form.playbackHlsUrl.trim() || undefined : undefined,
      playbackDashUrl: !isYoutube ? form.playbackDashUrl.trim() || undefined : undefined,

      lifecycle: "READY",
    };

    const res = await adminFetch(`/api/admin/events/${selectedEventId}/streams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    if (!res.ok) {
      setMessage(`Failed to create stream: ${text}`);
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

    const text = await res.text();

    if (!res.ok) {
      setMessage(`Failed to update stream: ${text}`);
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
                setForm((prev) => ({
                  ...emptyForm,
                  sourceType: e.target.value,
                  provider: e.target.value === "YOUTUBE" ? "YouTube" : "custom",
                  isPrimary: prev.isPrimary,
                  priority: prev.priority || 0,
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
                  placeholder="Paste YouTube URL"
                  value={form.youtubeUrl}
                  onChange={(e) => handleYouTubeUrlChange(e.target.value)}
                />

                <div style={styles.helperText}>
                  Parsed YouTube ID: <strong>{form.youtubeVideoId || "—"}</strong>
                </div>

                {loadingYouTube ? (
                  <div style={styles.helperText}>Loading YouTube metadata...</div>
                ) : null}

                <input
                  style={styles.input}
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />

                {form.youtubeThumbnailUrl ? (
                  <div style={styles.previewCard}>
                    <img
                      src={form.youtubeThumbnailUrl}
                      alt="YouTube thumbnail"
                      style={styles.previewImage}
                    />
                  </div>
                ) : null}

                {form.youtubeChannelName ? (
                  <div style={styles.helperText}>
                    Channel: <strong>{form.youtubeChannelName}</strong>
                  </div>
                ) : null}

                {form.youtubeLiveStatus ? (
                  <div style={styles.helperText}>
                    YouTube status: <strong>{form.youtubeLiveStatus}</strong>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <input
                  style={styles.input}
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />

                <input
                  style={styles.input}
                  placeholder="Playback HLS URL"
                  value={form.playbackHlsUrl}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, playbackHlsUrl: e.target.value }))
                  }
                />

                <input
                  style={styles.input}
                  placeholder="Playback DASH URL"
                  value={form.playbackDashUrl}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, playbackDashUrl: e.target.value }))
                  }
                />
              </>
            )}

            <input
              style={styles.input}
              type="number"
              placeholder="Priority"
              value={form.priority}
              onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
            />

            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={form.isPrimary}
                onChange={(e) => setForm((prev) => ({ ...prev, isPrimary: e.target.checked }))}
              />
              Primary stream
            </label>

            <button
              type="submit"
              style={{
                ...styles.button,
                ...(canSubmit ? {} : styles.buttonDisabled),
              }}
              disabled={!canSubmit}
            >
              {loadingYouTube ? "Loading YouTube..." : "Create Stream"}
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
    lifecycle: stream.lifecycle || "READY",
  });

  return (
    <div style={styles.rowCard}>
      <input
        style={styles.input}
        value={draft.title}
        onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
      />

      <input
        style={styles.input}
        type="number"
        value={draft.priority}
        onChange={(e) => setDraft((prev) => ({ ...prev, priority: Number(e.target.value) }))}
      />

      {isYoutube ? (
        <input
          style={styles.input}
          placeholder="YouTube Video ID"
          value={draft.youtubeVideoId}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, youtubeVideoId: e.target.value }))
          }
        />
      ) : (
        <>
          <input
            style={styles.input}
            placeholder="Playback HLS URL"
            value={draft.playbackHlsUrl}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, playbackHlsUrl: e.target.value }))
            }
          />

          <input
            style={styles.input}
            placeholder="Playback DASH URL"
            value={draft.playbackDashUrl}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, playbackDashUrl: e.target.value }))
            }
          />
        </>
      )}

      <select
        style={styles.input}
        value={draft.lifecycle}
        onChange={(e) => setDraft((prev) => ({ ...prev, lifecycle: e.target.value }))}
      >
        <option value="READY">READY</option>
        <option value="LIVE">LIVE</option>
        <option value="ENDED">ENDED</option>
        <option value="DISABLED">DISABLED</option>
        <option value="ERROR">ERROR</option>
      </select>

      <label style={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={draft.isPrimary}
          onChange={(e) => setDraft((prev) => ({ ...prev, isPrimary: e.target.checked }))}
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
  previewCard: {
    border: "1px solid #2a3647",
    borderRadius: 12,
    overflow: "hidden",
    background: "#0f141a",
  },
  previewImage: {
    width: "100%",
    display: "block",
    maxHeight: 240,
    objectFit: "cover",
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