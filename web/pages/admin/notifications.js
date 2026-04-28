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

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [streams, setStreams] = useState([]);
  const [selectedStreamId, setSelectedStreamId] = useState("");
  const [message, setMessage] = useState("");

  async function loadAll() {
    const [notificationsRes, streamsRes] = await Promise.all([
      adminFetch("/api/admin/notifications"),
      adminFetch("/api/admin/streams"),
    ]);

    const notificationsJson = await notificationsRes.json();
    const streamsJson = await streamsRes.json();

    setNotifications(Array.isArray(notificationsJson) ? notificationsJson : []);
    setStreams(Array.isArray(streamsJson) ? streamsJson : []);

    if (!selectedStreamId && Array.isArray(streamsJson) && streamsJson.length > 0) {
      setSelectedStreamId(streamsJson[0].id);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function createLiveNow() {
    if (!selectedStreamId) {
      setMessage("Select a stream first.");
      return;
    }

    const res = await adminFetch(`/api/admin/notifications/live-now/${selectedStreamId}`, {
      method: "POST",
    });

    const json = await res.json();

    if (!res.ok || json?.ok === false) {
      setMessage(json?.error || "Failed to create notification.");
      return;
    }

    setMessage("LIVE NOW notification created.");
    loadAll();
  }

  return (
    <AdminLayout title="Notifications">
      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Create LIVE NOW Notification</h2>

        <p style={styles.mutedText}>
          Beta-safe mode: this creates a notification log entry first. Later we can connect this to push, SMS, email, or Racemaster Live alerts.
        </p>

        <select
          style={styles.input}
          value={selectedStreamId}
          onChange={(e) => setSelectedStreamId(e.target.value)}
        >
          <option value="">Select stream</option>
          {streams.map((stream) => (
            <option key={stream.id} value={stream.id}>
              {stream.event?.title || "Unknown Event"} — {stream.title || "Live Feed"} — {stream.lifecycle}
            </option>
          ))}
        </select>

        <button type="button" style={styles.button} onClick={createLiveNow}>
          Create LIVE NOW Notification
        </button>

        {message ? <p style={styles.message}>{message}</p> : null}
      </section>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Notification Log</h2>

        {notifications.length === 0 ? (
          <p style={styles.mutedText}>No notifications created yet.</p>
        ) : (
          <div style={styles.list}>
            {notifications.map((item) => (
              <div key={item.id} style={styles.card}>
                <div style={styles.cardTop}>
                  <div>
                    <div style={styles.title}>{item.title}</div>
                    <div style={styles.meta}>{item.message}</div>
                  </div>
                  <span style={styles.badge}>{item.status}</span>
                </div>

                <div style={styles.details}>
                  <div>Type: {item.type}</div>
                  <div>Event: {item.eventSlug || "—"}</div>
                  <div>Stream: {item.streamId || "—"}</div>
                  <div>Created: {formatDate(item.createdAt)}</div>
                  <div>Sent: {formatDate(item.sentAt)}</div>
                </div>
              </div>
            ))}
          </div>
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
  sectionTitle: {
    marginTop: 0,
    marginBottom: 12,
  },
  mutedText: {
    color: "#9aa4af",
    lineHeight: 1.5,
  },
  input: {
    width: "100%",
    background: "#0f141a",
    border: "1px solid #2a3647",
    color: "#f5f7fa",
    borderRadius: 10,
    padding: "12px 14px",
    marginTop: 12,
  },
  button: {
    background: "#2563eb",
    color: "#fff",
    border: 0,
    borderRadius: 10,
    padding: "12px 14px",
    cursor: "pointer",
    marginTop: 12,
  },
  message: {
    marginTop: 12,
    color: "#8fd19e",
  },
  list: {
    display: "grid",
    gap: 12,
  },
  card: {
    background: "#0f141a",
    border: "1px solid #2a3647",
    borderRadius: 12,
    padding: 14,
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  title: {
    fontWeight: 800,
    color: "#f5f7fa",
  },
  meta: {
    color: "#9aa4af",
    marginTop: 4,
  },
  badge: {
    background: "#1b2a40",
    color: "#8fb3ff",
    border: "1px solid #31598b",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 800,
  },
  details: {
    display: "grid",
    gap: 4,
    marginTop: 12,
    color: "#c9d1d9",
    fontSize: 13,
  },
};