import { useEffect, useState } from "react";
import Link from "next/link";
import ContributorLayout from "../../components/ContributorLayout";
import { requireContributorPage } from "../../lib/requireContributorPage";

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function itemTone(item) {
  if (item?.moderationStatus === "REJECTED") return styles.badgeRejected;
  if (item?.lifecycle === "LIVE") return styles.badgeLive;
  if (item?.moderationStatus === "APPROVED") return styles.badgeApproved;
  return styles.badgePending;
}

function itemLabel(item) {
  if (item?.lifecycle === "LIVE") return "Live";
  if (item?.moderationStatus === "REJECTED") return "Rejected";
  if (item?.moderationStatus === "APPROVED") return "Approved";
  return "Pending Review";
}

export default function ContributorHomePage({ currentUser }) {
  const [dashboard, setDashboard] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const res = await fetch("/api/contributor/dashboard", { credentials: "include" });
        const text = await res.text();
        if (!res.ok) throw new Error(text || "Failed to load contributor dashboard");
        setDashboard(text ? JSON.parse(text) : null);
      } catch (err) {
        setMessage(err.message || "Failed to load contributor dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const streamSummary = dashboard?.streamSummary || { total: 0, approved: 0, rejected: 0, pending: 0, live: 0 };
  const videoSummary = dashboard?.videoSummary || { total: 0, approved: 0, rejected: 0, pending: 0 };

  return (
    <ContributorLayout title="Dashboard">
      <p style={styles.subtitle}>
        Signed in as <strong>{currentUser?.email}</strong>. Submit livestreams and videos for the events you are covering.
      </p>

      {message ? <div style={styles.message}>{message}</div> : null}

      <div style={styles.grid}>
        <Link href="/contributor/streams" style={styles.card}>
          <h2 style={styles.cardTitle}>Submit Streams</h2>
          <p style={styles.cardText}>Add livestream feeds for events and manage your submitted stream items.</p>
        </Link>

        <Link href="/contributor/videos" style={styles.card}>
          <h2 style={styles.cardTitle}>Submit Videos</h2>
          <p style={styles.cardText}>Upload or link finished video coverage and event media for review.</p>
        </Link>
      </div>

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}><div style={styles.summaryTitle}>Streams</div><div style={styles.summaryValue}>{streamSummary.total}</div><div style={styles.summaryMeta}>{streamSummary.live} live • {streamSummary.approved} approved • {streamSummary.rejected} rejected</div></div>
        <div style={styles.summaryCard}><div style={styles.summaryTitle}>Videos</div><div style={styles.summaryValue}>{videoSummary.total}</div><div style={styles.summaryMeta}>{videoSummary.pending} pending • {videoSummary.approved} approved • {videoSummary.rejected} rejected</div></div>
      </div>

      <div style={styles.twoCol}>
        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>Recent Stream Status</h2>
            <Link href="/contributor/streams" style={styles.inlineLink}>Manage Streams</Link>
          </div>
          {loading ? <p style={styles.muted}>Loading...</p> : !(dashboard?.recentStreams || []).length ? <p style={styles.muted}>No stream submissions yet.</p> : (
            <div style={styles.list}>
              {dashboard.recentStreams.map((item) => (
                <div key={item.id} style={styles.listItem}>
                  <div>
                    <div style={styles.itemTitle}>{item.title || "Untitled feed"}</div>
                    <div style={styles.itemMeta}>{item.event?.title || "Unknown event"} • {formatDateTime(item.updatedAt || item.createdAt)}</div>
                  </div>
                  <span style={{ ...styles.badge, ...itemTone(item) }}>{itemLabel(item)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>Recent Video Status</h2>
            <Link href="/contributor/videos" style={styles.inlineLink}>Manage Videos</Link>
          </div>
          {loading ? <p style={styles.muted}>Loading...</p> : !(dashboard?.recentVideos || []).length ? <p style={styles.muted}>No video submissions yet.</p> : (
            <div style={styles.list}>
              {dashboard.recentVideos.map((item) => (
                <div key={item.id} style={styles.listItem}>
                  <div>
                    <div style={styles.itemTitle}>{item.title || "Untitled video"}</div>
                    <div style={styles.itemMeta}>{item.event?.title || "Unknown event"} • {formatDateTime(item.updatedAt || item.createdAt)}</div>
                    {item.moderationStatus === "REJECTED" && item.rejectionReason ? <div style={styles.rejectionReason}>Rejected: {item.rejectionReason}</div> : null}
                  </div>
                  <span style={{ ...styles.badge, ...itemTone(item) }}>{itemLabel(item)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </ContributorLayout>
  );
}

export const getServerSideProps = requireContributorPage;

const styles = {
  subtitle: { margin: "0 0 24px", color: "#c9d1d9", lineHeight: 1.6 },
  message: { marginBottom: 16, background: "#3a1616", border: "1px solid #7a2d2d", color: "#ffd3d3", borderRadius: 12, padding: "12px 14px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 18 },
  card: { textDecoration: "none", color: "#f5f7fa", border: "1px solid #1f2937", background: "#11161c", borderRadius: 14, padding: 20 },
  cardTitle: { margin: "0 0 8px", fontSize: 22 },
  cardText: { margin: 0, color: "#c9d1d9", lineHeight: 1.5 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 18 },
  summaryCard: { background: "#11161c", border: "1px solid #1f2937", borderRadius: 14, padding: 18 },
  summaryTitle: { color: "#8fb3ff", textTransform: "uppercase", letterSpacing: 0.6, fontSize: 12, marginBottom: 8 },
  summaryValue: { fontSize: 32, fontWeight: 800 },
  summaryMeta: { color: "#9aa4af", marginTop: 6 },
  twoCol: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 },
  panel: { background: "#11161c", border: "1px solid #1f2937", borderRadius: 14, padding: 18 },
  panelHeader: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 },
  panelTitle: { margin: 0 },
  inlineLink: { color: "#8fb3ff", textDecoration: "none" },
  muted: { color: "#9aa4af" },
  list: { display: "grid", gap: 12 },
  listItem: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", border: "1px solid #243041", borderRadius: 12, padding: 14, background: "#0f141a" },
  itemTitle: { fontWeight: 700, marginBottom: 4 },
  itemMeta: { color: "#9aa4af", fontSize: 14 },
  rejectionReason: { marginTop: 8, color: "#ffd3d3", fontSize: 14 },
  badge: { display: "inline-block", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" },
  badgePending: { background: "#4a3412", color: "#ffd28b", border: "1px solid #7a5320" },
  badgeApproved: { background: "#163222", color: "#9fe3b4", border: "1px solid #28563a" },
  badgeRejected: { background: "#3a1616", color: "#ffd3d3", border: "1px solid #7a2d2d" },
  badgeLive: { background: "#172d45", color: "#bfe0ff", border: "1px solid #3c6fa7" },
};
