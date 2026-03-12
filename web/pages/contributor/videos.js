import { useEffect, useState } from "react";
import ContributorLayout from "../../components/ContributorLayout";
import { requireContributorPage } from "../../lib/requireContributorPage";

function getVideoStatusLabel(video) {
  if (video?.moderationStatus === "REJECTED") return "Rejected";
  if (video?.moderationStatus === "APPROVED") return "Approved";
  return "Pending Review";
}

function formatEventOptionLabel(event) {
  const datePart = event.startAt
    ? new Date(event.startAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "No date";

  const locationPart =
    event.city || event.state
      ? [event.city, event.state].filter(Boolean).join(", ")
      : "Location TBD";

  return `${datePart} - ${locationPart} - ${event.title}`;
}

export default function ContributorVideosPage({ currentUser }) {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [message, setMessage] = useState("");
  const [myVideos, setMyVideos] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [busyId, setBusyId] = useState("");

  const emptyForm = {
    sourceType: "YOUTUBE",
    title: "",
    description: "",
    youtubeVideoId: "",
    playbackHlsUrl: "",
    playbackDashUrl: "",
    durationSeconds: "",
    publishedAt: "",
  };

  const [form, setForm] = useState(emptyForm);

  async function parse(res) {
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async function loadEvents() {
    const res = await fetch("/api/contributor/events", {
      credentials: "include",
    });
    const json = await parse(res);
    const list = Array.isArray(json) ? json : [];
    setEvents(list);

    if (!selectedEventId && list.length > 0) {
      setSelectedEventId(list[0].id);
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

  function resetForm() {
    setForm(emptyForm);
    setEditingId("");
  }

  function toDatetimeLocalString(value) {
    if (!value) return "";
    const d = new Date(value);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  }

  function startEdit(video) {
    setEditingId(video.id);
    setMessage("");
    setForm({
      sourceType: video.sourceType || "YOUTUBE",
      title: video.title || "",
      description: video.description || "",
      youtubeVideoId: video.youtubeVideoId || "",
      playbackHlsUrl: video.playbackHlsUrl || "",
      playbackDashUrl: video.playbackDashUrl || "",
      durationSeconds:
        video.durationSeconds !== null && video.durationSeconds !== undefined
          ? String(video.durationSeconds)
          : "",
      publishedAt: toDatetimeLocalString(video.publishedAt),
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    const url = editingId
      ? `/api/contributor/videos/${editingId}`
      : `/api/contributor/events/${selectedEventId}/videos`;

    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        durationSeconds: form.durationSeconds ? Number(form.durationSeconds) : undefined,
        publishedAt: form.publishedAt || undefined,
      }),
    });

    const json = await parse(res);

    if (!res.ok || json?.ok === false) {
      setMessage(json?.error || `Failed to ${editingId ? "update" : "submit"} video.`);
      return;
    }

    setMessage(editingId ? "Video updated." : "Video submitted for review.");
    resetForm();
    loadMyVideos(selectedEventId);
  }

  async function handleDelete(videoId) {
    const confirmed = window.confirm("Delete this pending or rejected video submission?");
    if (!confirmed) return;

    setBusyId(videoId);
    setMessage("");

    try {
      const res = await fetch(`/api/contributor/videos/${videoId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const json = await parse(res);

      if (!res.ok || json?.ok === false) {
        setMessage(json?.error || "Failed to delete video.");
        return;
      }

      if (editingId === videoId) {
        resetForm();
      }

      setMessage("Video deleted.");
      loadMyVideos(selectedEventId);
    } finally {
      setBusyId("");
    }
  }

  return (
    <ContributorLayout title="Videos">
      <p style={styles.subtitle}>
        Signed in as <strong>{currentUser?.email}</strong>.
      </p>

      <div style={styles.panel}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>
            {editingId ? "Edit Video Submission" : "Submit Video"}
          </h2>
          {editingId ? (
            <button type="button" style={styles.secondaryButton} onClick={resetForm}>
              Cancel Edit
            </button>
          ) : null}
        </div>

        <select
          style={styles.input}
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
        >
          <option value="">Select event</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {formatEventOptionLabel(event)}
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
            {editingId ? "Save Changes" : "Submit Video"}
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
            {myVideos.map((video) => {
              const locked = video.moderationStatus === "APPROVED";

              return (
                <div key={video.id} style={styles.card}>
                  <div style={styles.rowTop}>
                    <div>
                      <div style={styles.itemTitle}>{video.title}</div>
                      <div style={styles.itemMeta}>{getVideoStatusLabel(video)}</div>
                    </div>

                    <span
                      style={{
                        ...styles.badge,
                        ...(video.moderationStatus === "REJECTED"
                          ? styles.badgeRejected
                          : video.moderationStatus === "APPROVED"
                          ? styles.badgeApproved
                          : styles.badgePending),
                      }}
                    >
                      {getVideoStatusLabel(video)}
                    </span>
                  </div>

                  <div style={styles.itemDetails}>
                    {video.description ? <div>{video.description}</div> : null}
                    {video.youtubeVideoId ? <div>YouTube: {video.youtubeVideoId}</div> : null}
                    {video.playbackHlsUrl ? <div>HLS attached</div> : null}
                    {video.playbackDashUrl ? <div>DASH attached</div> : null}
                    {video.durationSeconds ? <div>Duration: {video.durationSeconds}s</div> : null}
                  </div>

                  {video.moderationStatus === "REJECTED" && video.rejectionReason ? (
                    <div style={styles.rejectionBox}>
                      <strong>Rejection reason:</strong> {video.rejectionReason}
                    </div>
                  ) : null}

                  <div style={styles.actions}>
                    <button
                      type="button"
                      style={{
                        ...styles.secondaryButton,
                        ...(locked ? styles.buttonDisabled : {}),
                      }}
                      disabled={locked}
                      onClick={() => startEdit(video)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      style={{
                        ...styles.deleteButton,
                        ...(locked || busyId === video.id ? styles.buttonDisabled : {}),
                      }}
                      disabled={locked || busyId === video.id}
                      onClick={() => handleDelete(video.id)}
                    >
                      {busyId === video.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>

                  {locked ? (
                    <p style={styles.lockedText}>
                      This video has been approved and can no longer be edited here.
                    </p>
                  ) : null}
                </div>
              );
            })}
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
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  sectionTitle: {
    margin: 0,
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
  secondaryButton: {
    background: "#1b2a40",
    color: "#fff",
    border: "1px solid #31598b",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
  },
  deleteButton: {
    background: "#8f2d2d",
    color: "#fff",
    border: 0,
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  message: {
    color: "#8fd19e",
  },
  muted: {
    color: "#9aa4af",
  },
  list: {
    display: "grid",
    gap: 14,
  },
  card: {
    border: "1px solid #243041",
    background: "#0f141a",
    borderRadius: 12,
    padding: 14,
  },
  rowTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  itemTitle: {
    fontWeight: 700,
    marginBottom: 4,
  },
  itemMeta: {
    color: "#9aa4af",
    fontSize: 14,
  },
  itemDetails: {
    marginTop: 10,
    display: "grid",
    gap: 6,
    color: "#c9d1d9",
    fontSize: 14,
  },
  actions: {
    marginTop: 14,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  badge: {
    fontSize: 12,
    borderRadius: 999,
    padding: "6px 10px",
    whiteSpace: "nowrap",
  },
  badgePending: {
    background: "#4a3412",
    color: "#ffd28b",
    border: "1px solid #7a5320",
  },
  badgeApproved: {
    background: "#163222",
    color: "#9fe3b4",
    border: "1px solid #28563a",
  },
  badgeRejected: {
    background: "#3a1616",
    color: "#ffd3d3",
    border: "1px solid #7a2d2d",
  },
  rejectionBox: {
    marginTop: 12,
    background: "#3a1616",
    border: "1px solid #7a2d2d",
    color: "#ffd3d3",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
  },
  lockedText: {
    marginTop: 12,
    color: "#9aa4af",
    fontSize: 13,
  },
};