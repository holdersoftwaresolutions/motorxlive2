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

function toPublishedIso(dateStr) {
  return dateStr ? new Date(`${dateStr}T12:00:00`).toISOString() : undefined;
}

function dateOnlyValueFromIso(value) {
  if (!value) return "";
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

const emptyForm = {
  sourceType: "YOUTUBE",
  title: "",
  description: "",
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
  status: "READY",
  publishedDate: "",
};

export default function AdminVideosPage() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [videos, setVideos] = useState([]);
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

    return (
      !!form.title.trim() &&
      (!!form.playbackHlsUrl.trim() || !!form.playbackDashUrl.trim())
    );
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

  function resetForm() {
    setForm(emptyForm);
  }

  async function handleYouTubeUrlChange(value) {
    setForm((prev) => ({
      ...prev,
      youtubeUrl: value,
      youtubeVideoId: parseYouTubeUrl(value)?.videoId || "",
    }));

    const parsed = parseYouTubeUrl(value);
    if (!value.trim() || !parsed?.videoId) return;

    try {
      setLoadingYouTube(true);
      setMessage("Loading YouTube details...");

      const data = await autofillYouTube(value);

      setForm((prev) => ({
        ...prev,
        title: data?.title || prev.title,
        description: data?.description || prev.description,
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
      title: form.title.trim() || undefined,
      description: form.description.trim() || undefined,

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

      status: form.status,
      publishedAt: form.publishedDate ? toPublishedIso(form.publishedDate) : undefined,
    };

    const res = await adminFetch(`/api/admin/events/${selectedEventId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    if (!res.ok) {
      setMessage(`Failed to create video: ${text}`);
      return;
    }

    setMessage("Video created.");
    resetForm();
    loadVideos(selectedEventId);
  }

  async function updateVideo(id, patch) {
    const res = await adminFetch(`/api/admin/videos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    const text = await res.text();

    if (!res.ok) {
      setMessage(`Failed to update video: ${text}`);
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
            <select
              style={styles.input}
              value={form.sourceType}
              onChange={(e) =>
                setForm((prev) => ({
                  ...emptyForm,
                  sourceType: e.target.value,
                  status: prev.status || "READY",
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

                <textarea
                  style={styles.textarea}
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
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
              </>
            ) : (
              <>
                <input
                  style={styles.input}
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />

                <textarea
                  style={styles.textarea}
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
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
              type="date"
              value={form.publishedDate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, publishedDate: e.target.value }))
              }
            />

            <select
              style={styles.input}
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="PROCESSING">PROCESSING</option>
              <option value="READY">READY</option>
              <option value="FAILED">FAILED</option>
              <option value="DISABLED">DISABLED</option>
            </select>

            <button
              type="submit"
              style={{
                ...styles.button,
                ...(canSubmit ? {} : styles.buttonDisabled),
              }}
              disabled={!canSubmit}
            >
              {loadingYouTube ? "Loading YouTube..." : "Create Video"}
            </button>
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
    publishedDate: dateOnlyValueFromIso(video.publishedAt),
  });

  return (
    <div style={styles.rowCard}>
      <input
        style={styles.input}
        value={draft.title}
        onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
      />

      <textarea
        style={styles.textarea}
        value={draft.description}
        onChange={(e) =>
          setDraft((prev) => ({ ...prev, description: e.target.value }))
        }
      />

      <input
        style={styles.input}
        placeholder="YouTube Video ID"
        value={draft.youtubeVideoId}
        onChange={(e) =>
          setDraft((prev) => ({ ...prev, youtubeVideoId: e.target.value }))
        }
      />

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
        type="date"
        value={draft.publishedDate}
        onChange={(e) =>
          setDraft((prev) => ({ ...prev, publishedDate: e.target.value }))
        }
      />

      <select
        style={styles.input}
        value={draft.status}
        onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value }))}
      >
        <option value="PROCESSING">PROCESSING</option>
        <option value="READY">READY</option>
        <option value="FAILED">FAILED</option>
        <option value="DISABLED">DISABLED</option>
      </select>

      <button
        style={styles.secondaryButton}
        onClick={() =>
          onSave(video.id, {
            title: draft.title,
            description: draft.description,
            youtubeVideoId: draft.youtubeVideoId || undefined,
            playbackHlsUrl: draft.playbackHlsUrl || undefined,
            playbackDashUrl: draft.playbackDashUrl || undefined,
            status: draft.status,
            publishedAt: draft.publishedDate ? toPublishedIso(draft.publishedDate) : undefined,
          })
        }
      >
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