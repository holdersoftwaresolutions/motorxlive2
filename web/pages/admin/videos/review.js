import { useEffect, useState } from "react";
import AdminLayout from "../../../components/AdminLayout";
import { adminFetch } from "../../../lib/adminFetch";
import { requireAdminPage } from "../../../lib/requireAdminPage";

export default function AdminVideoReviewPage({ currentUser }) {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState("");
  const [rejectingId, setRejectingId] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  async function loadQueue() {
    try {
      setLoading(true);
      setMessage("");

      const res = await adminFetch("/api/admin/videos/review-queue");
      const text = await res.text();

      if (!res.ok) {
        throw new Error(text || "Failed to load video review queue");
      }

      const json = text ? JSON.parse(text) : [];
      setItems(Array.isArray(json) ? json : []);
    } catch (err) {
      setMessage(err.message || "Failed to load video review queue.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, []);

  async function approveVideo(id) {
    try {
      setActingId(id);
      setMessage("");

      const res = await adminFetch(`/api/admin/videos/${id}/approve`, {
        method: "POST",
      });

      const text = await res.text();

      if (!res.ok) {
        throw new Error(text || "Failed to approve video");
      }

      setMessage("Video approved.");
      await loadQueue();
    } catch (err) {
      setMessage(err.message || "Failed to approve video.");
    } finally {
      setActingId("");
    }
  }

  async function rejectVideo(id) {
    try {
      setActingId(id);
      setMessage("");

      const res = await adminFetch(`/api/admin/videos/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: rejectReason,
        }),
      });

      const text = await res.text();

      if (!res.ok) {
        throw new Error(text || "Failed to reject video");
      }

      setRejectReason("");
      setRejectingId("");
      setMessage("Video rejected.");
      await loadQueue();
    } catch (err) {
      setMessage(err.message || "Failed to reject video.");
    } finally {
      setActingId("");
    }
  }

  return (
    <AdminLayout title="Video Review">
      <div style={styles.topRow}>
        <div>
          <p style={styles.description}>
            Review contributor-submitted videos before they appear publicly.
          </p>
          <p style={styles.signedIn}>
            Signed in as <strong>{currentUser?.email}</strong>.
          </p>
        </div>

        <button style={styles.secondaryButton} onClick={loadQueue} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Queue"}
        </button>
      </div>

      {message ? <div style={styles.message}>{message}</div> : null}

      {loading ? (
        <p style={styles.mutedText}>Loading review queue...</p>
      ) : items.length === 0 ? (
        <div style={styles.emptyState}>
          <h2 style={styles.emptyTitle}>No pending videos</h2>
          <p style={styles.mutedText}>
            There are no contributor-submitted videos waiting for review right now.
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {items.map((item) => {
            const event = item.event || {};
            const category = event.category || {};
            const submittedBy = item.submittedBy || {};

            return (
              <div key={item.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <p style={styles.eyebrow}>{category.name || "Uncategorized"}</p>
                    <h2 style={styles.cardTitle}>{item.title || "Untitled Video"}</h2>
                  </div>

                  <span style={styles.statusBadge}>
                    {item.status || "READY"}
                  </span>
                </div>

                <div style={styles.metaBlock}>
                  <div>
                    <strong>Event:</strong> {event.title || "Unknown event"}
                  </div>
                  {event.slug ? (
                    <div>
                      <strong>Event Page:</strong>{" "}
                      <a
                        href={`/events/${event.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.link}
                      >
                        /events/{event.slug}
                      </a>
                    </div>
                  ) : null}
                  <div>
                    <strong>Source Type:</strong> {item.sourceType || "—"}
                  </div>
                  <div>
                    <strong>Provider:</strong> {item.provider || "custom"}
                  </div>
                  <div>
                    <strong>Duration:</strong>{" "}
                    {item.durationSeconds ? `${item.durationSeconds}s` : "—"}
                  </div>
                </div>

                <div style={styles.metaBlock}>
                  <div>
                    <strong>Submitted By:</strong>{" "}
                    {submittedBy.email ||
                      submittedBy.name ||
                      submittedBy.id ||
                      item.submittedByUserId ||
                      "Unknown"}
                  </div>
                  <div>
                    <strong>Needs Review:</strong> {item.needsReview ? "Yes" : "No"}
                  </div>
                  <div>
                    <strong>Created At:</strong>{" "}
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString()
                      : "—"}
                  </div>
                </div>

                {item.description ? (
                  <div style={styles.sourceBox}>
                    <strong>Description:</strong> {item.description}
                  </div>
                ) : null}

                <div style={styles.sourceBox}>
                  {item.youtubeVideoId ? (
                    <div>
                      <strong>YouTube Video ID:</strong> {item.youtubeVideoId}
                    </div>
                  ) : null}

                  {item.playbackHlsUrl ? (
                    <div>
                      <strong>HLS:</strong>{" "}
                      <a
                        href={item.playbackHlsUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.link}
                      >
                        Open HLS URL
                      </a>
                    </div>
                  ) : null}

                  {item.playbackDashUrl ? (
                    <div>
                      <strong>DASH:</strong>{" "}
                      <a
                        href={item.playbackDashUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.link}
                      >
                        Open DASH URL
                      </a>
                    </div>
                  ) : null}

                  {!item.youtubeVideoId &&
                  !item.playbackHlsUrl &&
                  !item.playbackDashUrl ? (
                    <div style={styles.mutedText}>
                      No playback source found on this submission.
                    </div>
                  ) : null}
                </div>

                {rejectingId === item.id ? (
                  <div style={styles.rejectBox}>
                    <textarea
                      style={styles.textarea}
                      placeholder="Reason for rejection"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div style={styles.actions}>
                      <button
                        type="button"
                        style={styles.rejectButton}
                        onClick={() => rejectVideo(item.id)}
                      >
                        Confirm Reject
                      </button>
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() => {
                          setRejectingId("");
                          setRejectReason("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={styles.actions}>
                    <button
                      style={{
                        ...styles.approveButton,
                        ...(actingId === item.id ? styles.buttonDisabled : {}),
                      }}
                      onClick={() => approveVideo(item.id)}
                      disabled={actingId === item.id}
                    >
                      {actingId === item.id ? "Working..." : "Approve"}
                    </button>

                    <button
                      style={{
                        ...styles.rejectButton,
                        ...(actingId === item.id ? styles.buttonDisabled : {}),
                      }}
                      onClick={() => setRejectingId(item.id)}
                      disabled={actingId === item.id}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}

export const getServerSideProps = requireAdminPage;

const styles = {
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 18,
    flexWrap: "wrap",
  },
  description: {
    margin: 0,
    color: "#c9d1d9",
    lineHeight: 1.5,
  },
  signedIn: {
    marginTop: 8,
    color: "#9aa4af",
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
    marginBottom: 18,
    background: "#162235",
    border: "1px solid #31598b",
    color: "#dbeafe",
    borderRadius: 12,
    padding: "12px 14px",
  },
  emptyState: {
    background: "#11161c",
    border: "1px solid #1f2937",
    borderRadius: 16,
    padding: 24,
  },
  emptyTitle: {
    marginTop: 0,
    marginBottom: 10,
  },
  mutedText: {
    color: "#9aa4af",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: 18,
  },
  card: {
    background: "#11161c",
    border: "1px solid #1f2937",
    borderRadius: 16,
    padding: 18,
    display: "grid",
    gap: 16,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "flex-start",
  },
  eyebrow: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#8fb3ff",
    margin: "0 0 6px",
  },
  cardTitle: {
    margin: 0,
    fontSize: 22,
    lineHeight: 1.2,
  },
  statusBadge: {
    background: "#162235",
    border: "1px solid #31598b",
    color: "#dbeafe",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  metaBlock: {
    display: "grid",
    gap: 8,
    color: "#c9d1d9",
    fontSize: 14,
  },
  sourceBox: {
    background: "#0f141a",
    border: "1px solid #243041",
    borderRadius: 12,
    padding: 12,
    display: "grid",
    gap: 8,
    fontSize: 14,
    color: "#c9d1d9",
  },
  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  approveButton: {
    background: "#1f8f4e",
    color: "#fff",
    border: 0,
    borderRadius: 10,
    padding: "12px 14px",
    cursor: "pointer",
  },
  rejectButton: {
    background: "#8f2d2d",
    color: "#fff",
    border: 0,
    borderRadius: 10,
    padding: "12px 14px",
    cursor: "pointer",
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
  link: {
    color: "#8fb3ff",
    textDecoration: "none",
  },
  rejectBox: {
    marginTop: 12,
    display: "grid",
    gap: 10,
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
};