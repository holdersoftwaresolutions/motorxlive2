import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { adminFetch } from "../../lib/adminFetch";
import { requireAdminPage } from "../../lib/requireAdminPage";

const CATEGORIES = [
  "DRAG_RACING",
  "OFFROAD",
  "SXS_UTV",
  "MOTORSPORTS_PODCAST",
  "GENERAL_MOTORSPORTS",
  "TRACK_CHANNEL",
  "EVENT_PROMOTER",
  "CREATOR_MEDIA",
];

function formatDate(value) {
  if (!value) return "Never";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "Never";
  }
}

function formatNumber(value) {
  if (value === null || value === undefined) return "—";
  try {
    return Number(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function AdminYouTubeChannelsPage() {
  const [channels, setChannels] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [loading, setLoading] = useState(false);
  const [monitoringAll, setMonitoringAll] = useState(false);
  const [busyId, setBusyId] = useState("");

  async function loadChannels() {
    try {
      setLoading(true);
      setMessage("");

      const res = await adminFetch("/api/admin/youtube-discovery/approved-channels");
      const text = await res.text();

      if (!res.ok) {
        throw new Error(text || "Failed to load approved channels.");
      }

      const json = text ? JSON.parse(text) : [];
      setChannels(Array.isArray(json) ? json : []);
    } catch (err) {
      setMessage(err.message || "Failed to load approved channels.");
      setMessageType("error");
      setChannels([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChannels();
  }, []);

  async function saveChannelSettings(id, patch) {
    try {
      setBusyId(id);
      setMessage("");

      const res = await adminFetch(`/api/admin/youtube-discovery/channels/${id}/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });

      const text = await res.text();

      if (!res.ok) {
        throw new Error(text || "Failed to update channel settings.");
      }

      setMessage("Channel settings updated.");
      setMessageType("success");
      await loadChannels();
    } catch (err) {
      setMessage(err.message || "Failed to update channel settings.");
      setMessageType("error");
    } finally {
      setBusyId("");
    }
  }

  async function monitorChannel(id) {
    try {
      setBusyId(id);
      setMessage("");

      const res = await adminFetch(`/api/admin/youtube-discovery/channels/${id}/monitor`, {
        method: "POST",
      });

      const text = await res.text();

      if (!res.ok) {
        throw new Error(text || "Failed to monitor channel.");
      }

      const json = text ? JSON.parse(text) : null;

      setMessage(
        `Monitored channel. Found ${json?.videoCount ?? 0} recent videos, ${json?.liveCount ?? 0} live, ${json?.upcomingCount ?? 0} upcoming.`
      );
      setMessageType("success");
      await loadChannels();
    } catch (err) {
      setMessage(err.message || "Failed to monitor channel.");
      setMessageType("error");
    } finally {
      setBusyId("");
    }
  }

  async function monitorAllApproved() {
    try {
      setMonitoringAll(true);
      setMessage("Monitoring all approved channels...");
      setMessageType("success");

      const res = await adminFetch("/api/admin/youtube-discovery/monitor-approved", {
        method: "POST",
      });

      const text = await res.text();

      if (!res.ok) {
        throw new Error(text || "Failed to monitor approved channels.");
      }

      const json = text ? JSON.parse(text) : null;

      setMessage(`Monitoring complete. Checked ${json?.monitoredCount ?? 0} channels.`);
      setMessageType("success");
      await loadChannels();
    } catch (err) {
      setMessage(err.message || "Failed to monitor approved channels.");
      setMessageType("error");
    } finally {
      setMonitoringAll(false);
    }
  }

  return (
    <AdminLayout title="Approved YouTube Channels">
      <div style={styles.topBar}>
        <div>
          <h2 style={styles.pageTitle}>Approved Channels</h2>
          <p style={styles.mutedText}>
            Manage approved YouTube channels, monitoring, and future auto-ingest settings.
          </p>
        </div>

        <div style={styles.topActions}>
          <button
            type="button"
            style={{
              ...styles.button,
              ...(monitoringAll ? styles.buttonDisabled : {}),
            }}
            disabled={monitoringAll}
            onClick={monitorAllApproved}
          >
            {monitoringAll ? "Monitoring..." : "Monitor All Approved"}
          </button>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={loadChannels}
            disabled={loading || monitoringAll}
          >
            Refresh
          </button>
        </div>
      </div>

      {message ? (
        <p
          style={{
            ...styles.message,
            ...(messageType === "error" ? styles.errorMessage : {}),
          }}
        >
          {message}
        </p>
      ) : null}

      <section style={styles.panel}>
        {loading ? <p style={styles.mutedText}>Loading approved channels...</p> : null}

        {!loading && channels.length === 0 ? (
          <p style={styles.mutedText}>
            No approved channels yet. Approve channels from YouTube Discovery first.
          </p>
        ) : null}

        <div style={styles.list}>
          {channels.map((channel) => (
            <ChannelSettingsCard
              key={channel.id}
              channel={channel}
              busy={busyId === channel.id}
              onSave={(patch) => saveChannelSettings(channel.id, patch)}
              onMonitor={() => monitorChannel(channel.id)}
            />
          ))}
        </div>
      </section>
    </AdminLayout>
  );
}

function ChannelSettingsCard({ channel, busy, onSave, onMonitor }) {
  const [draft, setDraft] = useState({
    category: channel.category || "GENERAL_MOTORSPORTS",
    autoIngestStreams: !!channel.autoIngestStreams,
    autoIngestVideos: !!channel.autoIngestVideos,
    autoIngestPodcasts: !!channel.autoIngestPodcasts,
    isFeatured: !!channel.isFeatured,
    priority: channel.priority ?? 0,
  });

  const videos = Array.isArray(channel.videos) ? channel.videos : [];

  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <div style={styles.identity}>
          {channel.thumbnailUrl ? (
            <img src={channel.thumbnailUrl} alt={channel.title} style={styles.avatar} />
          ) : (
            <div style={styles.avatarPlaceholder}>YT</div>
          )}

          <div>
            <div style={styles.channelTitle}>{channel.title}</div>
            <div style={styles.channelMeta}>
              Score {channel.score ?? 0} • Last monitored: {formatDate(channel.lastMonitoredAt)}
            </div>
            {channel.channelUrl ? (
              <a href={channel.channelUrl} target="_blank" rel="noreferrer" style={styles.link}>
                Open YouTube Channel
              </a>
            ) : null}
          </div>
        </div>

        <div style={styles.metrics}>
          <Metric label="Live" value={channel.recentLiveCount} />
          <Metric label="Upcoming" value={channel.upcomingLiveCount} />
          <Metric label="Completed" value={channel.completedLiveCount} />
          <Metric label="Subs" value={formatNumber(channel.subscriberCount)} />
        </div>
      </div>

      <div style={styles.settingsGrid}>
        <label style={styles.field}>
          <span style={styles.label}>Category</span>
          <select
            style={styles.input}
            value={draft.category}
            onChange={(e) => setDraft((s) => ({ ...s, category: e.target.value }))}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.field}>
          <span style={styles.label}>Priority</span>
          <input
            style={styles.input}
            type="number"
            value={draft.priority}
            onChange={(e) => setDraft((s) => ({ ...s, priority: Number(e.target.value) }))}
          />
        </label>
      </div>

      <div style={styles.checkboxGrid}>
        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={draft.autoIngestStreams}
            onChange={(e) =>
              setDraft((s) => ({ ...s, autoIngestStreams: e.target.checked }))
            }
          />
          Auto-ingest streams
        </label>

        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={draft.autoIngestVideos}
            onChange={(e) =>
              setDraft((s) => ({ ...s, autoIngestVideos: e.target.checked }))
            }
          />
          Auto-ingest videos
        </label>

        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={draft.autoIngestPodcasts}
            onChange={(e) =>
              setDraft((s) => ({ ...s, autoIngestPodcasts: e.target.checked }))
            }
          />
          Auto-ingest podcasts
        </label>

        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={draft.isFeatured}
            onChange={(e) => setDraft((s) => ({ ...s, isFeatured: e.target.checked }))}
          />
          Featured channel
        </label>
      </div>

      {videos.length ? (
        <div style={styles.videoPreview}>
          <div style={styles.smallHeading}>Recent Videos</div>
          <div style={styles.videoList}>
            {videos.map((video) => (
              <div key={video.id} style={styles.videoRow}>
                {video.thumbnailUrl ? (
                  <img src={video.thumbnailUrl} alt={video.title} style={styles.videoThumb} />
                ) : null}

                <div>
                  <div style={styles.videoTitle}>{video.title}</div>
                  <div style={styles.videoMeta}>
                    {video.liveBroadcastContent || "none"} •{" "}
                    {video.embeddable === false ? "not embeddable" : "embeddable"}
                  </div>
                  {video.watchUrl ? (
                    <a href={video.watchUrl} target="_blank" rel="noreferrer" style={styles.link}>
                      Watch on YouTube
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={styles.actions}>
        <button
          type="button"
          style={{
            ...styles.button,
            ...(busy ? styles.buttonDisabled : {}),
          }}
          disabled={busy}
          onClick={() => onSave(draft)}
        >
          {busy ? "Saving..." : "Save Settings"}
        </button>

        <button
          type="button"
          style={{
            ...styles.secondaryButton,
            ...(busy ? styles.buttonDisabled : {}),
          }}
          disabled={busy}
          onClick={onMonitor}
        >
          {busy ? "Working..." : "Monitor Now"}
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div style={styles.metric}>
      <div style={styles.metricValue}>{value ?? 0}</div>
      <div style={styles.metricLabel}>{label}</div>
    </div>
  );
}

export const getServerSideProps = requireAdminPage;

const styles = {
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 18,
    flexWrap: "wrap",
  },
  pageTitle: {
    margin: "0 0 6px",
  },
  mutedText: {
    color: "#9aa4af",
    lineHeight: 1.5,
    margin: 0,
  },
  topActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  panel: {
    background: "#11161c",
    border: "1px solid #1f2937",
    borderRadius: 14,
    padding: 18,
  },
  list: {
    display: "grid",
    gap: 16,
  },
  card: {
    background: "#0f141a",
    border: "1px solid #2a3647",
    borderRadius: 14,
    padding: 16,
  },
  cardTop: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr",
    gap: 16,
    alignItems: "start",
  },
  identity: {
    display: "flex",
    gap: 14,
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 12,
    objectFit: "cover",
    background: "#11161c",
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    background: "#1b2a40",
    color: "#8fb3ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },
  channelTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#f5f7fa",
  },
  channelMeta: {
    color: "#9aa4af",
    fontSize: 13,
    marginTop: 4,
  },
  link: {
    color: "#8fb3ff",
    textDecoration: "none",
    fontSize: 13,
    display: "inline-block",
    marginTop: 6,
  },
  metrics: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 10,
  },
  metric: {
    background: "#11161c",
    border: "1px solid #243041",
    borderRadius: 10,
    padding: 10,
  },
  metricValue: {
    color: "#f5f7fa",
    fontWeight: 800,
  },
  metricLabel: {
    color: "#9aa4af",
    fontSize: 12,
    marginTop: 4,
  },
  settingsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 160px",
    gap: 12,
    marginTop: 16,
  },
  field: {
    display: "grid",
    gap: 6,
  },
  label: {
    color: "#c9d1d9",
    fontSize: 13,
  },
  input: {
    width: "100%",
    background: "#11161c",
    border: "1px solid #2a3647",
    color: "#f5f7fa",
    borderRadius: 10,
    padding: "10px 12px",
  },
  checkboxGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 10,
    marginTop: 14,
  },
  checkboxRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    color: "#dbe5f0",
    background: "#11161c",
    border: "1px solid #243041",
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
  },
  videoPreview: {
    marginTop: 16,
  },
  smallHeading: {
    color: "#f5f7fa",
    fontWeight: 800,
    marginBottom: 8,
  },
  videoList: {
    display: "grid",
    gap: 10,
  },
  videoRow: {
    display: "grid",
    gridTemplateColumns: "120px 1fr",
    gap: 12,
    alignItems: "center",
    background: "#11161c",
    border: "1px solid #243041",
    borderRadius: 12,
    padding: 10,
  },
  videoThumb: {
    width: "100%",
    aspectRatio: "16 / 9",
    objectFit: "cover",
    borderRadius: 8,
    background: "#000",
  },
  videoTitle: {
    color: "#f5f7fa",
    fontWeight: 700,
  },
  videoMeta: {
    color: "#9aa4af",
    fontSize: 13,
    marginTop: 4,
  },
  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 16,
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
    color: "#8fd19e",
    marginBottom: 14,
  },
  errorMessage: {
    color: "#ffb4b4",
  },
};