import { useEffect, useState } from "react";
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

export default function AdminAutoEventsPage() {
  const [autoEvents, setAutoEvents] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedTargets, setSelectedTargets] = useState({});
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setMessage("");

    const [autoRes, eventsRes] = await Promise.all([
      adminFetch("/api/admin/youtube-auto-events"),
      adminFetch("/api/admin/events"),
    ]);

    const autoJson = await autoRes.json();
    const eventsJson = await eventsRes.json();

    setAutoEvents(Array.isArray(autoJson) ? autoJson : []);
    setEvents(Array.isArray(eventsJson) ? eventsJson : []);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function approve(id) {
    setBusyId(id);
    setMessage("");

    try {
      const res = await adminFetch(`/api/admin/youtube-auto-events/${id}/approve`, {
        method: "PATCH",
      });

      const json = await res.json();

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || "Failed to approve auto event.");
      }

      setMessage("Auto-created event approved and published.");
      await loadData();
    } catch (err) {
      setMessage(err.message || "Failed to approve auto event.");
    } finally {
      setBusyId("");
    }
  }

  async function archive(id) {
    if (!window.confirm("Archive this auto-created event?")) return;

    setBusyId(id);
    setMessage("");

    try {
      const res = await adminFetch(`/api/admin/youtube-auto-events/${id}/archive`, {
        method: "PATCH",
      });

      const json = await res.json();

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || "Failed to archive auto event.");
      }

      setMessage("Auto-created event archived.");
      await loadData();
    } catch (err) {
      setMessage(err.message || "Failed to archive auto event.");
    } finally {
      setBusyId("");
    }
  }

  async function merge(id) {
    const targetEventId = selectedTargets[id];

    if (!targetEventId) {
      setMessage("Select a target event first.");
      return;
    }

    if (!window.confirm("Move all streams/videos to the selected event and mark this auto event as merged?")) {
      return;
    }

    setBusyId(id);
    setMessage("");

    try {
      const res = await adminFetch(`/api/admin/youtube-auto-events/${id}/merge`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetEventId }),
      });

      const json = await res.json();

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || "Failed to merge auto event.");
      }

      setMessage(
        `Merged. Moved ${json.movedStreams || 0} stream(s) and ${json.movedVideos || 0} video(s).`
      );

      await loadData();
    } catch (err) {
      setMessage(err.message || "Failed to merge auto event.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <AdminLayout title="Auto-Created YouTube Events">
      <section style={styles.panel}>
        <h2 style={styles.title}>Auto-Created YouTube Events</h2>
        <p style={styles.muted}>
          Review holding events created from YouTube metadata. Approve them, merge their
          streams/videos into an existing event, or archive them.
        </p>

        {message ? <p style={styles.message}>{message}</p> : null}
      </section>

      <section style={styles.list}>
        {autoEvents.length === 0 ? (
          <div style={styles.panel}>
            <p style={styles.muted}>No auto-created events yet.</p>
          </div>
        ) : (
          autoEvents.map((event) => (
            <div key={event.id} style={styles.card}>
              <div style={styles.cardTop}>
                <div>
                  <div style={styles.eventTitle}>{event.title}</div>
                  <div style={styles.meta}>
                    {event.eventReviewStatus} • {formatDate(event.startAt)}
                  </div>
                  <div style={styles.meta}>
                    Streams: {event.streams?.length || 0} • Videos: {event.videos?.length || 0}
                  </div>
                </div>

                {event.heroImageUrl ? (
                  <img src={event.heroImageUrl} alt={event.title} style={styles.thumb} />
                ) : null}
              </div>

              {event.description ? (
                <p style={styles.description}>{event.description.slice(0, 280)}</p>
              ) : null}

              <div style={styles.mergeBox}>
                <select
                  style={styles.input}
                  value={selectedTargets[event.id] || ""}
                  onChange={(e) =>
                    setSelectedTargets((prev) => ({
                      ...prev,
                      [event.id]: e.target.value,
                    }))
                  }
                >
                  <option value="">Merge into existing event...</option>
                  {events
                    .filter((target) => target.id !== event.id)
                    .map((target) => (
                      <option key={target.id} value={target.id}>
                        {target.title} — {formatDate(target.startAt)}
                      </option>
                    ))}
                </select>

                <button
                  type="button"
                  style={styles.secondaryButton}
                  disabled={busyId === event.id}
                  onClick={() => merge(event.id)}
                >
                  Merge
                </button>
              </div>

              <div style={styles.actions}>
                <button
                  type="button"
                  style={styles.button}
                  disabled={busyId === event.id || event.eventReviewStatus === "PUBLISHED"}
                  onClick={() => approve(event.id)}
                >
                  Approve / Publish
                </button>

                <button
                  type="button"
                  style={styles.dangerButton}
                  disabled={busyId === event.id || event.eventReviewStatus === "ARCHIVED"}
                  onClick={() => archive(event.id)}
                >
                  Archive
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </AdminLayout>
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
  title: {
    margin: "0 0 8px",
  },
  muted: {
    color: "#9aa4af",
    lineHeight: 1.5,
  },
  message: {
    color: "#8fd19e",
    marginTop: 12,
  },
  list: {
    display: "grid",
    gap: 16,
  },
  card: {
    background: "#11161c",
    border: "1px solid #1f2937",
    borderRadius: 14,
    padding: 18,
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: "#f5f7fa",
  },
  meta: {
    color: "#9aa4af",
    marginTop: 4,
    fontSize: 13,
  },
  thumb: {
    width: 160,
    aspectRatio: "16 / 9",
    objectFit: "cover",
    borderRadius: 10,
    background: "#000",
  },
  description: {
    color: "#c9d1d9",
    lineHeight: 1.5,
    marginTop: 14,
  },
  mergeBox: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 10,
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
  actions: {
    display: "flex",
    gap: 10,
    marginTop: 14,
    flexWrap: "wrap",
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
  dangerButton: {
    background: "#8f2d2d",
    color: "#fff",
    border: 0,
    borderRadius: 10,
    padding: "12px 14px",
    cursor: "pointer",
  },
};