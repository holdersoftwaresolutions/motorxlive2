import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/AdminLayout";
import { adminFetch } from "../../../lib/adminFetch";
import { requireAdminPage } from "../../../lib/requireAdminPage";

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
}

function statusTone(item) {
  if (item?.moderationStatus === "REJECTED") return styles.badgeRejected;
  if (item?.lifecycle === "LIVE") return styles.badgeLive;
  return styles.badgeApproved;
}

export default function AdminStreamReviewPage({ currentUser }) {
  const [queueItems, setQueueItems] = useState([]);
  const [recentItems, setRecentItems] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState("");
  const [rejectingId, setRejectingId] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");

      const [queueRes, streamsRes] = await Promise.all([
        adminFetch("/api/admin/streams/review-queue"),
        adminFetch("/api/admin/streams"),
      ]);

      const queueText = await queueRes.text();
      const streamsText = await streamsRes.text();

      if (!queueRes.ok) throw new Error(queueText || "Failed to load stream review queue");
      if (!streamsRes.ok) throw new Error(streamsText || "Failed to load recent streams");

      const queueJson = queueText ? JSON.parse(queueText) : [];
      const streamsJson = streamsText ? JSON.parse(streamsText) : [];

      setQueueItems(Array.isArray(queueJson) ? queueJson : []);
      setRecentItems(Array.isArray(streamsJson) ? streamsJson.slice(0, 12) : []);
    } catch (err) {
      setMessage(err.message || "Failed to load stream review data.");
      setQueueItems([]);
      setRecentItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function approveStream(id) {
    try {
      setActingId(id);
      setMessage("");
      const res = await adminFetch(`/api/admin/streams/${id}/approve`, { method: "POST" });
      const text = await res.text();
      if (!res.ok) throw new Error(text || "Failed to approve stream");
      setMessage("Stream approved.");
      await loadData();
    } catch (err) {
      setMessage(err.message || "Failed to approve stream.");
    } finally {
      setActingId("");
    }
  }

  async function rejectStream(id) {
    try {
      setActingId(id);
      setMessage("");
      const res = await adminFetch(`/api/admin/streams/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || "Failed to reject stream");
      setRejectReason("");
      setRejectingId("");
      setMessage("Stream rejected.");
      await loadData();
    } catch (err) {
      setMessage(err.message || "Failed to reject stream.");
    } finally {
      setActingId("");
    }
  }

  const recentSummary = useMemo(() => {
    return recentItems.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.moderationStatus === "REJECTED") acc.rejected += 1;
        else acc.approved += 1;
        if (item.lifecycle === "LIVE") acc.live += 1;
        return acc;
      },
      { total: 0, approved: 0, rejected: 0, live: 0 }
    );
  }, [recentItems]);

  return (
    <AdminLayout title="Stream Review">
      <div style={styles.topRow}>
        <div>
          <p style={styles.description}>
            Live feeds are now auto-approved for beta contributors. This page still shows any stream that manually lands in review,
            plus a recent stream activity feed so you can verify what is publicly available.
          </p>
          <p style={styles.signedIn}>Signed in as <strong>{currentUser?.email}</strong>.</p>
        </div>
        <button style={styles.secondaryButton} onClick={loadData} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {message ? <div style={styles.message}>{message}</div> : null}

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}><div style={styles.summaryValue}>{queueItems.length}</div><div style={styles.summaryLabel}>Pending queue</div></div>
        <div style={styles.summaryCard}><div style={styles.summaryValue}>{recentSummary.approved}</div><div style={styles.summaryLabel}>Recent approved</div></div>
        <div style={styles.summaryCard}><div style={styles.summaryValue}>{recentSummary.live}</div><div style={styles.summaryLabel}>Live now</div></div>
        <div style={styles.summaryCard}><div style={styles.summaryValue}>{recentSummary.rejected}</div><div style={styles.summaryLabel}>Recent rejected</div></div>
      </div>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Pending Stream Queue</h2>
        {loading ? (
          <p style={styles.mutedText}>Loading queue...</p>
        ) : queueItems.length === 0 ? (
          <div style={styles.emptyState}>
            <h3 style={styles.emptyTitle}>No streams waiting for review</h3>
            <p style={styles.mutedText}>That is expected while live feeds bypass moderation during private beta.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {queueItems.map((item) => {
              const event = item.event || {};
              const submittedBy = item.submittedBy || {};
              return (
                <div key={item.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.cardTitle}>{item.title || "Untitled feed"}</h3>
                      <div style={styles.cardMeta}>{event.title || "Unknown event"}</div>
                    </div>
                    <span style={{ ...styles.badge, ...styles.badgePending }}>{item.moderationStatus || "PENDING"}</span>
                  </div>
                  <div style={styles.metaBlock}>
                    <div><strong>Contributor:</strong> {submittedBy.email || submittedBy.name || "Unknown"}</div>
                    <div><strong>Source:</strong> {item.sourceType || "—"}</div>
                    <div><strong>Created:</strong> {formatDateTime(item.createdAt)}</div>
                  </div>
                  {item.youtubeVideoId ? <div style={styles.sourceBox}><strong>YouTube:</strong> {item.youtubeVideoId}</div> : null}
                  {item.playbackHlsUrl ? <div style={styles.sourceBox}><strong>HLS:</strong> <a href={item.playbackHlsUrl} target="_blank" rel="noreferrer" style={styles.link}>Open HLS URL</a></div> : null}
                  {rejectingId === item.id ? (
                    <div style={styles.rejectBox}>
                      <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection" style={styles.textarea} />
                      <div style={styles.actions}>
                        <button style={styles.dangerButton} onClick={() => rejectStream(item.id)} disabled={actingId === item.id}>{actingId === item.id ? "Rejecting..." : "Confirm Reject"}</button>
                        <button style={styles.secondaryButton} onClick={() => { setRejectingId(""); setRejectReason(""); }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={styles.actions}>
                      <button style={styles.primaryButton} onClick={() => approveStream(item.id)} disabled={actingId === item.id}>{actingId === item.id ? "Approving..." : "Approve"}</button>
                      <button style={styles.dangerButton} onClick={() => setRejectingId(item.id)} disabled={actingId === item.id}>Reject</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Recent Stream Activity</h2>
        {recentItems.length === 0 ? (
          <p style={styles.mutedText}>No streams found yet.</p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Title</th>
                  <th style={styles.th}>Event</th>
                  <th style={styles.th}>Contributor</th>
                  <th style={styles.th}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {recentItems.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}><span style={{ ...styles.badge, ...statusTone(item) }}>{item.lifecycle === "LIVE" ? "LIVE" : item.moderationStatus}</span></td>
                    <td style={styles.td}>{item.title || "Untitled feed"}</td>
                    <td style={styles.td}>{item.event?.slug ? <a href={`/events/${item.event.slug}`} target="_blank" rel="noreferrer" style={styles.link}>{item.event.title}</a> : (item.event?.title || "—")}</td>
                    <td style={styles.td}>{item.submittedBy?.email || item.submittedBy?.name || "—"}</td>
                    <td style={styles.td}>{formatDateTime(item.updatedAt || item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}

export const getServerSideProps = requireAdminPage;

const styles = {
  topRow: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 18 },
  description: { margin: "0 0 8px", color: "#c9d1d9", lineHeight: 1.6, maxWidth: 900 },
  signedIn: { margin: 0, color: "#9aa4af" },
  message: { marginBottom: 16, background: "#13271c", border: "1px solid #2d6842", color: "#b6f0c4", borderRadius: 12, padding: "12px 14px" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 18 },
  summaryCard: { background: "#11161c", border: "1px solid #1f2937", borderRadius: 14, padding: 16 },
  summaryValue: { fontSize: 28, fontWeight: 800 },
  summaryLabel: { color: "#9aa4af", marginTop: 6 },
  section: { marginBottom: 22 },
  sectionTitle: { margin: "0 0 12px" },
  emptyState: { background: "#11161c", border: "1px solid #1f2937", borderRadius: 14, padding: 18 },
  emptyTitle: { margin: "0 0 8px" },
  mutedText: { color: "#9aa4af" },
  grid: { display: "grid", gap: 14 },
  card: { background: "#11161c", border: "1px solid #1f2937", borderRadius: 14, padding: 18 },
  cardHeader: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" },
  cardTitle: { margin: "0 0 4px" },
  cardMeta: { color: "#9aa4af" },
  badge: { display: "inline-block", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700 },
  badgePending: { background: "#4a3412", color: "#ffd28b", border: "1px solid #7a5320" },
  badgeApproved: { background: "#163222", color: "#9fe3b4", border: "1px solid #28563a" },
  badgeRejected: { background: "#3a1616", color: "#ffd3d3", border: "1px solid #7a2d2d" },
  badgeLive: { background: "#172d45", color: "#bfe0ff", border: "1px solid #3c6fa7" },
  metaBlock: { display: "grid", gap: 6, marginTop: 12, color: "#dbe5f0" },
  sourceBox: { marginTop: 12, background: "#0f141a", border: "1px solid #243041", borderRadius: 10, padding: "10px 12px", color: "#c9d1d9" },
  textarea: { width: "100%", minHeight: 86, background: "#0f141a", border: "1px solid #2a3647", color: "#f5f7fa", borderRadius: 10, padding: "12px 14px", resize: "vertical" },
  actions: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 },
  primaryButton: { background: "#2563eb", color: "#fff", border: 0, borderRadius: 10, padding: "10px 14px", cursor: "pointer" },
  secondaryButton: { background: "#1b2a40", color: "#fff", border: "1px solid #31598b", borderRadius: 10, padding: "10px 14px", cursor: "pointer" },
  dangerButton: { background: "#8f2d2d", color: "#fff", border: 0, borderRadius: 10, padding: "10px 14px", cursor: "pointer" },
  rejectBox: { marginTop: 12 },
  tableWrap: { overflowX: "auto", background: "#11161c", border: "1px solid #1f2937", borderRadius: 14 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.7, color: "#8fb3ff", padding: "12px 14px", borderBottom: "1px solid #1f2937" },
  td: { padding: "12px 14px", borderBottom: "1px solid #1a222d", color: "#dbe5f0", verticalAlign: "top" },
  link: { color: "#8fb3ff" },
};
