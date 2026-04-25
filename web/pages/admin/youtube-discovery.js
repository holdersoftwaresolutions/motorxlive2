import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { adminFetch } from "../../lib/adminFetch";
import { requireAdminPage } from "../../lib/requireAdminPage";

const DEFAULT_TERMS = [
  "drag racing live",
  "no prep racing live",
  "bracket racing live",
  "radial racing live",
  "grudge racing live",
  "offroad racing live",
  "sxs racing live",
  "utv racing live",
  "motorsports podcast",
  "drag racing podcast",
].join("\n");

function formatNumber(value) {
  if (value === null || value === undefined) return "—";
  try {
    return Number(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
}

function normalizeReasons(value) {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return [value];
    }
  }

  return [];
}

export default function AdminYouTubeDiscoveryPage() {
  const [channels, setChannels] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [loading, setLoading] = useState(false);
  const [runningDiscovery, setRunningDiscovery] = useState(false);
  const [termsText, setTermsText] = useState(DEFAULT_TERMS);
  const [maxResultsPerSearch, setMaxResultsPerSearch] = useState(3);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredChannels = useMemo(() => {
    if (statusFilter === "ALL") return channels;
    return channels.filter((channel) => channel.discoveryStatus === statusFilter);
  }, [channels, statusFilter]);

  async function loadChannels() {
    try {
      setLoading(true);
      setMessage("");

      const res = await adminFetch("/api/admin/youtube-discovery/channels");
      const text = await res.text();

      if (!res.ok) {
        throw new Error(text || "Failed to load discovered YouTube channels.");
      }

      const json = text ? JSON.parse(text) : [];
      setChannels(Array.isArray(json) ? json : []);
    } catch (err) {
      setMessage(err.message || "Failed to load discovered YouTube channels.");
      setMessageType("error");
      setChannels([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChannels();
  }, []);

  async function runDiscovery() {
    try {
      setRunningDiscovery(true);
      setMessage("Running YouTube discovery...");
      setMessageType("success");

      const terms = termsText
        .split("\n")
        .map((term) => term.trim())
        .filter(Boolean);

      const res = await adminFetch("/api/admin/youtube-discovery/discover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          terms,
          maxResultsPerSearch: Number(maxResultsPerSearch || 3),
        }),
      });

      const text = await res.text();

      if (!res.ok) {
        throw new Error(text || "YouTube discovery failed.");
      }

      const json = text ? JSON.parse(text) : null;

      setMessage(
        `Discovery complete. Found ${json?.channelCount ?? 0} channels from ${json?.videoCount ?? 0} videos.`
      );
      setMessageType("success");

      await loadChannels();
    } catch (err) {
      setMessage(err.message || "YouTube discovery failed.");
      setMessageType("error");
    } finally {
      setRunningDiscovery(false);
    }
  }

  async function updateStatus(id, action) {
    try {
      setMessage("");

      const res = await adminFetch(`/api/admin/youtube-discovery/channels/${id}/${action}`, {
        method: "PATCH",
      });

      const text = await res.text();

      if (!res.ok) {
        throw new Error(text || `Failed to ${action} channel.`);
      }

      setMessage(action === "approve" ? "Channel approved." : "Channel ignored.");
      setMessageType("success");

      await loadChannels();
    } catch (err) {
      setMessage(err.message || `Failed to ${action} channel.`);
      setMessageType("error");
    }
  }

  return (
    <AdminLayout title="YouTube Discovery">
      <div style={styles.grid}>
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Run Discovery</h2>

          <p style={styles.mutedText}>
            Search YouTube for motorsports content, extract channels, score them, and queue them for approval.
          </p>

          <label style={styles.label}>Search Terms</label>
          <textarea
            style={styles.textarea}
            value={termsText}
            onChange={(e) => setTermsText(e.target.value)}
          />

          <label style={styles.label}>Max Results Per Search</label>
          <input
            style={styles.input}
            type="number"
            min="1"
            max="10"
            value={maxResultsPerSearch}
            onChange={(e) => setMaxResultsPerSearch(e.target.value)}
          />

          <button
            type="button"
            style={{
              ...styles.button,
              ...(runningDiscovery ? styles.buttonDisabled : {}),
            }}
            disabled={runningDiscovery}
            onClick={runDiscovery}
          >
            {runningDiscovery ? "Running Discovery..." : "Run Discovery"}
          </button>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={loadChannels}
            disabled={loading || runningDiscovery}
          >
            Refresh Channels
          </button>

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
        </section>

        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Discovery Summary</h2>

          <div style={styles.summaryGrid}>
            <SummaryCard label="Total Channels" value={channels.length} />
            <SummaryCard
              label="Discovered"
              value={channels.filter((c) => c.discoveryStatus === "DISCOVERED").length}
            />
            <SummaryCard
              label="Approved"
              value={channels.filter((c) => c.discoveryStatus === "APPROVED").length}
            />
            <SummaryCard
              label="Ignored"
              value={channels.filter((c) => c.discoveryStatus === "IGNORED").length}
            />
          </div>

          <div style={styles.filterRow}>
            <label style={styles.label}>Filter</label>
            <select
              style={styles.input}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All</option>
              <option value="DISCOVERED">Discovered</option>
              <option value="APPROVED">Approved</option>
              <option value="IGNORED">Ignored</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>
        </section>
      </div>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Discovered Channels</h2>

        {loading ? <p style={styles.mutedText}>Loading channels...</p> : null}

        {!loading && filteredChannels.length === 0 ? (
          <p style={styles.mutedText}>No channels found yet.</p>
        ) : null}

        <div style={styles.channelList}>
          {filteredChannels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onApprove={() => updateStatus(channel.id, "approve")}
              onIgnore={() => updateStatus(channel.id, "ignore")}
            />
          ))}
        </div>
      </section>
    </AdminLayout>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryValue}>{value}</div>
      <div style={styles.summaryLabel}>{label}</div>
    </div>
  );
}

function ChannelCard({ channel, onApprove, onIgnore }) {
  const reasons = normalizeReasons(channel.scoreReasons);
  const recentVideos = Array.isArray(channel.videos) ? channel.videos : [];

  return (
    <div style={styles.channelCard}>
      <div style={styles.channelTop}>
        <div style={styles.channelIdentity}>
          {channel.thumbnailUrl ? (
            <img
              src={channel.thumbnailUrl}
              alt={channel.title}
              style={styles.channelImage}
            />
          ) : (
            <div style={styles.channelImagePlaceholder}>YT</div>
          )}

          <div>
            <div style={styles.channelTitle}>{channel.title}</div>
            <div style={styles.channelMeta}>
              {channel.category || "GENERAL_MOTORSPORTS"} • {channel.discoveryStatus}
            </div>
            {channel.channelUrl ? (
              <a
                href={channel.channelUrl}
                target="_blank"
                rel="noreferrer"
                style={styles.link}
              >
                Open Channel
              </a>
            ) : null}
          </div>
        </div>

        <div style={styles.scoreBox}>
          <div style={styles.scoreValue}>{channel.score ?? 0}</div>
          <div style={styles.scoreLabel}>Score</div>
        </div>
      </div>

      <div style={styles.metricsGrid}>
        <Metric label="Recent Live" value={channel.recentLiveCount} />
        <Metric label="Upcoming" value={channel.upcomingLiveCount} />
        <Metric label="Completed" value={channel.completedLiveCount} />
        <Metric label="Subscribers" value={formatNumber(channel.subscriberCount)} />
        <Metric label="Videos" value={formatNumber(channel.videoCount)} />
        <Metric label="Views" value={formatNumber(channel.viewCount)} />
      </div>

      {reasons.length ? (
        <div style={styles.reasons}>
          <div style={styles.smallHeading}>Score Reasons</div>
          <ul style={styles.reasonList}>
            {reasons.map((reason, index) => (
              <li key={`${channel.id}-reason-${index}`}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {recentVideos.length ? (
        <div style={styles.recentVideos}>
          <div style={styles.smallHeading}>Recent Discovered Videos</div>

          <div style={styles.videoList}>
            {recentVideos.map((video) => (
              <div key={video.id} style={styles.videoRow}>
                {video.thumbnailUrl ? (
                  <img src={video.thumbnailUrl} alt={video.title} style={styles.videoThumb} />
                ) : null}

                <div>
                  <div style={styles.videoTitle}>{video.title}</div>
                  <div style={styles.videoMeta}>
                    {video.liveBroadcastContent || "none"} • {formatDate(video.publishedAt)}
                  </div>
                  {video.watchUrl ? (
                    <a
                      href={video.watchUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.link}
                    >
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
            ...(channel.discoveryStatus === "APPROVED" ? styles.buttonDisabled : {}),
          }}
          disabled={channel.discoveryStatus === "APPROVED"}
          onClick={onApprove}
        >
          {channel.discoveryStatus === "APPROVED" ? "Approved" : "Approve"}
        </button>

        <button
          type="button"
          style={{
            ...styles.dangerButton,
            ...(channel.discoveryStatus === "IGNORED" ? styles.buttonDisabled : {}),
          }}
          disabled={channel.discoveryStatus === "IGNORED"}
          onClick={onIgnore}
        >
          {channel.discoveryStatus === "IGNORED" ? "Ignored" : "Ignore"}
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
  grid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: 20,
    marginBottom: 20,
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
  mutedText: {
    color: "#9aa4af",
    lineHeight: 1.5,
  },
  label: {
    display: "block",
    color: "#c9d1d9",
    fontSize: 13,
    marginBottom: 6,
    marginTop: 12,
  },
  textarea: {
    width: "100%",
    minHeight: 180,
    background: "#0f141a",
    border: "1px solid #2a3647",
    color: "#f5f7fa",
    borderRadius: 10,
    padding: "12px 14px",
    resize: "vertical",
    fontFamily: "inherit",
  },
  input: {
    width: "100%",
    background: "#0f141a",
    border: "1px solid #2a3647",
    color: "#f5f7fa",
    borderRadius: 10,
    padding: "12px 14px",
  },
  button: {
    background: "#2563eb",
    color: "#fff",
    border: 0,
    borderRadius: 10,
    padding: "12px 14px",
    cursor: "pointer",
    marginTop: 12,
    marginRight: 10,
  },
  secondaryButton: {
    background: "#1b2a40",
    color: "#fff",
    border: "1px solid #31598b",
    borderRadius: 10,
    padding: "12px 14px",
    cursor: "pointer",
    marginTop: 12,
  },
  dangerButton: {
    background: "#8f2d2d",
    color: "#fff",
    border: 0,
    borderRadius: 10,
    padding: "12px 14px",
    cursor: "pointer",
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  message: {
    marginTop: 12,
    color: "#8fd19e",
  },
  errorMessage: {
    color: "#ffb4b4",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  summaryCard: {
    background: "#0f141a",
    border: "1px solid #2a3647",
    borderRadius: 12,
    padding: 14,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 800,
    color: "#f5f7fa",
  },
  summaryLabel: {
    color: "#9aa4af",
    fontSize: 13,
    marginTop: 4,
  },
  filterRow: {
    marginTop: 18,
  },
  channelList: {
    display: "grid",
    gap: 16,
  },
  channelCard: {
    background: "#0f141a",
    border: "1px solid #2a3647",
    borderRadius: 14,
    padding: 16,
  },
  channelTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  channelIdentity: {
    display: "flex",
    gap: 14,
    alignItems: "center",
  },
  channelImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    objectFit: "cover",
    background: "#11161c",
  },
  channelImagePlaceholder: {
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
  scoreBox: {
    background: "#11161c",
    border: "1px solid #31598b",
    borderRadius: 12,
    padding: "10px 14px",
    textAlign: "center",
    minWidth: 90,
  },
  scoreValue: {
    fontSize: 26,
    fontWeight: 900,
    color: "#8fb3ff",
  },
  scoreLabel: {
    color: "#9aa4af",
    fontSize: 12,
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: 10,
    marginTop: 14,
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
  reasons: {
    marginTop: 14,
  },
  smallHeading: {
    color: "#f5f7fa",
    fontWeight: 800,
    marginBottom: 8,
  },
  reasonList: {
    margin: 0,
    paddingLeft: 20,
    color: "#c9d1d9",
    display: "grid",
    gap: 4,
  },
  recentVideos: {
    marginTop: 14,
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
    marginTop: 14,
  },
};