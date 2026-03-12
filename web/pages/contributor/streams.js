import { useEffect, useState } from "react";
import ContributorLayout from "../../components/ContributorLayout";
import { requireContributorPage } from "../../lib/requireContributorPage";

function getStatusLabel(stream) {
  if (stream?.needsReview) return "Pending Review";
  if (stream?.lifecycle === "LIVE") return "Approved / Live";
  if (stream?.lifecycle === "READY") return "Approved / Ready";
  if (stream?.lifecycle === "DISABLED") return "Disabled";
  if (stream?.lifecycle === "ERROR") return "Error";
  return "Reviewed";
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

export default function ContributorStreamsPage({ currentUser }) {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [message, setMessage] = useState("");
  const [myStreams, setMyStreams] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [busyId, setBusyId] = useState("");

  const emptyForm = {
    sourceType: "YOUTUBE",
    title: "",
    isPrimary: false,
    priority: 0,
    youtubeVideoId: "",
    playbackHlsUrl: "",
    playbackDashUrl: "",
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

  function resetForm() {
    setForm(emptyForm);
    setEditingId("");
  }

  function startEdit(stream) {
    setEditingId(stream.id);
    setMessage("");
    setForm({
      sourceType: stream.sourceType || "YOUTUBE",
      title: stream.title || "",
      isPrimary: !!stream.isPrimary,
      priority: stream.priority ?? 0,
      youtubeVideoId: stream.youtubeVideoId || "",
      playbackHlsUrl: stream.playbackHlsUrl || "",
      playbackDashUrl: stream.playbackDashUrl || "",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    const url = editingId
      ? `/api/contributor/streams/${editingId}`
      : `/api/contributor/events/${selectedEventId}/streams`;

    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        priority: Number(form.priority || 0),
      }),
    });

    const json = await parse(res);

    if (!res.ok || json?.ok === false) {
      setMessage(json?.error || `Failed to ${editingId ? "update" : "submit"} stream.`);
      return;
    }

    setMessage(editingId ? "Stream updated." : "Stream submitted for review.");
    resetForm();
    loadMyStreams(selectedEventId);
  }

  async function handleDelete(streamId) {
    const confirmed = window.confirm("Delete this pending stream submission?");
    if (!confirmed) return;

    setBusyId(streamId);
    setMessage("");

    try {
      const res = await fetch(`/api/contributor/streams/${streamId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const json = await parse(res);

      if (!res.ok || json?.ok === false) {
        setMessage(json?.error || "Failed to delete stream.");
        return;
      }

      if (editingId === streamId) {
        resetForm();
      }

      setMessage("Stream deleted.");
      loadMyStreams(selectedEventId);
    } finally {
      setBusyId("");
    }
  }

  return (
    <ContributorLayout title="Streams">
      <p style={styles.subtitle}>
        Signed in as <strong>{currentUser?.email}</strong>.
      </p>

      <div style={styles.panel}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>
            {editingId ? "Edit Stream Submission" : "Submit Stream"}
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
            {editingId ? "Save Changes" : "Submit Stream"}
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
            {myStreams.map((stream) => {
              const locked = !stream.needsReview;

              return (
                <div key={stream.id} style={styles.card}>
                  <div style={styles.rowTop}>
                    <div>
                      <div style={styles.itemTitle}>{stream.title || "Untitled Stream"}</div>
                      <div style={styles.itemMeta}>
                        {stream.sourceType} • {getStatusLabel(stream)}
                      </div>
                    </div>

                    <span
                      style={{
                        ...styles.badge,
                        ...(stream.needsReview ? styles.badgePending : styles.badgeApproved),
                      }}
                    >
                      {getStatusLabel(stream)}
                    </span>
                  </div>

                  <div style={styles.itemDetails}>
                    {stream.youtubeVideoId ? <div>YouTube: {stream.youtubeVideoId}</div> : null}
                    {stream.playbackHlsUrl ? <div>HLS attached</div> : null}
                    {stream.playbackDashUrl ? <div>DASH attached</div> : null}
                    <div>Priority: {stream.priority ?? 0}</div>
                    <div>Primary: {stream.isPrimary ? "Yes" : "No"}</div>
                  </div>

                  <div style={styles.actions}>
                    <button
                      type="button"
                      style={{
                        ...styles.secondaryButton,
                        ...(locked ? styles.buttonDisabled : {}),
                      }}
                      disabled={locked}
                      onClick={() => startEdit(stream)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      style={{
                        ...styles.deleteButton,
                        ...(locked || busyId === stream.id ? styles.buttonDisabled : {}),
                      }}
                      disabled={locked || busyId === stream.id}
                      onClick={() => handleDelete(stream.id)}
                    >
                      {busyId === stream.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>

                  {locked ? (
                    <p style={styles.lockedText}>
                      This stream has already been reviewed and can no longer be edited here.
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
  lockedText: {
    marginTop: 12,
    color: "#9aa4af",
    fontSize: 13,
  },
};