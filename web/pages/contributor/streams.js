import { useEffect, useState } from "react";
import ContributorLayout from "../../components/ContributorLayout";
import { requireContributorPage } from "../../lib/requireContributorPage";

function getStatusLabel(stream) {
  if (stream?.lifecycle === "LIVE") return "Live";
  if (stream?.moderationStatus === "REJECTED") return "Rejected";
  if (stream?.moderationStatus === "APPROVED") return "Approved";
  return "Pending Review";
}

function formatEventOptionLabel(event) {
  const datePart = event.startAt ? new Date(event.startAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No date";
  const locationPart = event.city || event.state ? [event.city, event.state].filter(Boolean).join(", ") : "Location TBD";
  return `${datePart} - ${locationPart} - ${event.title}`;
}

const emptyForm = { sourceType: "YOUTUBE", title: "", isPrimary: false, youtubeVideoId: "", playbackHlsUrl: "" };

async function parseResponse(res) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { ok: false, error: text }; }
}

export default function ContributorStreamsPage({ currentUser }) {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [message, setMessage] = useState("");
  const [myStreams, setMyStreams] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [busyId, setBusyId] = useState("");
  const [form, setForm] = useState(emptyForm);

  const isYoutube = form.sourceType === "YOUTUBE";
  const canSubmit = selectedEventId && (isYoutube ? form.youtubeVideoId.trim() : form.playbackHlsUrl.trim());

  async function loadEvents() {
    const res = await fetch("/api/contributor/events", { credentials: "include" });
    const json = await parseResponse(res);
    const list = Array.isArray(json) ? json : [];
    setEvents(list);
    if (!selectedEventId && list.length > 0) setSelectedEventId(list[0].id);
  }

  async function loadMyStreams(eventId) {
    if (!eventId) return setMyStreams([]);
    const res = await fetch(`/api/contributor/events/${eventId}/streams`, { credentials: "include" });
    const json = await parseResponse(res);
    setMyStreams(Array.isArray(json) ? json : []);
  }

  useEffect(() => { loadEvents(); }, []);
  useEffect(() => { if (selectedEventId) loadMyStreams(selectedEventId); }, [selectedEventId]);

  function resetForm() { setForm(emptyForm); setEditingId(""); }

  function startEdit(stream) {
    setEditingId(stream.id);
    setMessage("");
    setForm({
      sourceType: stream.sourceType || "YOUTUBE",
      title: stream.title || "",
      isPrimary: !!stream.isPrimary,
      youtubeVideoId: stream.youtubeVideoId || "",
      playbackHlsUrl: stream.playbackHlsUrl || "",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    if (!selectedEventId && !editingId) return setMessage("Select an event first.");
    if (isYoutube && !form.youtubeVideoId.trim()) return setMessage("YouTube Video ID is required.");
    if (!isYoutube && !form.playbackHlsUrl.trim()) return setMessage("Playback HLS URL is required.");

    const url = editingId ? `/api/contributor/streams/${editingId}` : `/api/contributor/events/${selectedEventId}/streams`;
    const method = editingId ? "PATCH" : "POST";

    const payload = {
      sourceType: form.sourceType,
      title: form.title.trim() || undefined,
      isPrimary: form.isPrimary,
      youtubeVideoId: isYoutube ? form.youtubeVideoId.trim() : undefined,
      playbackHlsUrl: !isYoutube ? form.playbackHlsUrl.trim() : undefined,
    };

    const res = await fetch(url, {
      method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const json = await parseResponse(res);
    if (!res.ok || json?.ok === false) return setMessage(json?.error || `Failed to ${editingId ? "update" : "submit"} stream.`);
    setMessage(editingId ? "Live feed updated." : "Live feed created and published.");
    resetForm();
    loadMyStreams(selectedEventId);
  }

  async function handleDelete(streamId) {
    if (!window.confirm("Delete this live feed?")) return;
    setBusyId(streamId);
    setMessage("");
    try {
      const res = await fetch(`/api/contributor/streams/${streamId}`, { method: "DELETE", credentials: "include" });
      const json = await parseResponse(res);
      if (!res.ok || json?.ok === false) return setMessage(json?.error || "Failed to delete stream.");
      if (editingId === streamId) resetForm();
      setMessage("Live feed deleted.");
      loadMyStreams(selectedEventId);
    } finally { setBusyId(""); }
  }

  return (
    <ContributorLayout title="Streams">
      <p style={styles.subtitle}>Signed in as <strong>{currentUser?.email}</strong>.</p>
      <div style={styles.panel}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>{editingId ? "Edit Live Feed" : "Create Live Feed"}</h2>
          {editingId ? <button type="button" style={styles.secondaryButton} onClick={resetForm}>Cancel Edit</button> : null}
        </div>

        <select style={styles.input} value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
          <option value="">Select event</option>
          {events.map((event) => <option key={event.id} value={event.id}>{formatEventOptionLabel(event)}</option>)}
        </select>

        <form onSubmit={handleSubmit} style={styles.form}>
          <select style={styles.input} value={form.sourceType} onChange={(e) => setForm((s) => ({ ...s, sourceType: e.target.value, youtubeVideoId: "", playbackHlsUrl: "" }))}>
            <option value="YOUTUBE">YouTube</option>
            <option value="EXTERNAL_HLS">External HLS</option>
          </select>
          <input style={styles.input} placeholder="Feed title (optional)" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
          {isYoutube ? <input style={styles.input} placeholder="YouTube Video ID" value={form.youtubeVideoId} onChange={(e) => setForm((s) => ({ ...s, youtubeVideoId: e.target.value }))} /> : <input style={styles.input} placeholder="Playback HLS URL" value={form.playbackHlsUrl} onChange={(e) => setForm((s) => ({ ...s, playbackHlsUrl: e.target.value }))} />}
          <label style={styles.checkboxRow}><input type="checkbox" checked={form.isPrimary} onChange={(e) => setForm((s) => ({ ...s, isPrimary: e.target.checked }))} />Primary live feed for this event</label>
          <button type="submit" style={{ ...styles.button, ...(canSubmit ? {} : styles.buttonDisabled) }} disabled={!canSubmit}>{editingId ? "Save Changes" : "Create Live Feed"}</button>
        </form>
        {message ? <p style={styles.message}>{message}</p> : null}
      </div>

      <div style={styles.panel}>
        <h2 style={styles.sectionTitle}>My Live Feeds</h2>
        {myStreams.length === 0 ? <p style={styles.muted}>No live feeds yet.</p> : <div style={styles.list}>{myStreams.map((stream) => (
          <div key={stream.id} style={styles.card}>
            <div style={styles.rowTop}>
              <div>
                <div style={styles.itemTitle}>{stream.title || "Untitled feed"}</div>
                <div style={styles.itemMeta}>{getStatusLabel(stream)}</div>
              </div>
              <span style={{ ...styles.badge, ...(stream.lifecycle === "LIVE" ? styles.badgeApproved : styles.badgePending) }}>{getStatusLabel(stream)}</span>
            </div>
            <div style={styles.itemDetails}>
              {stream.youtubeVideoId ? <div>YouTube: {stream.youtubeVideoId}</div> : null}
              {stream.playbackHlsUrl ? <div>HLS attached</div> : null}
              {stream.isPrimary ? <div>Primary feed</div> : null}
            </div>
            <div style={styles.actions}>
              <button type="button" style={styles.secondaryButton} onClick={() => startEdit(stream)}>Edit</button>
              <button type="button" style={{ ...styles.deleteButton, ...(busyId === stream.id ? styles.buttonDisabled : {}) }} disabled={busyId === stream.id} onClick={() => handleDelete(stream.id)}>{busyId === stream.id ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        ))}</div>}
      </div>
    </ContributorLayout>
  );
}

export const getServerSideProps = requireContributorPage;

const styles = {
  subtitle: { margin: "0 0 18px", color: "#c9d1d9" },
  panel: { background: "#11161c", border: "1px solid #1f2937", borderRadius: 14, padding: 18, marginBottom: 18 },
  sectionHeader: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" },
  sectionTitle: { margin: 0 },
  form: { display: "grid", gap: 12, marginTop: 12 },
  input: { width: "100%", background: "#0f141a", border: "1px solid #2a3647", color: "#f5f7fa", borderRadius: 10, padding: "12px 14px" },
  button: { background: "#2563eb", color: "#fff", border: 0, borderRadius: 10, padding: "12px 14px", cursor: "pointer" },
  secondaryButton: { background: "#1b2a40", color: "#fff", border: "1px solid #31598b", borderRadius: 10, padding: "10px 14px", cursor: "pointer" },
  deleteButton: { background: "#8f2d2d", color: "#fff", border: 0, borderRadius: 10, padding: "10px 14px", cursor: "pointer" },
  checkboxRow: { display: "flex", gap: 10, alignItems: "center", color: "#dbe5f0" },
  buttonDisabled: { opacity: 0.6, cursor: "not-allowed" },
  message: { color: "#8fd19e" },
  muted: { color: "#9aa4af" },
  list: { display: "grid", gap: 14 },
  card: { border: "1px solid #243041", background: "#0f141a", borderRadius: 12, padding: 14 },
  rowTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" },
  itemTitle: { fontWeight: 700, marginBottom: 4 },
  itemMeta: { color: "#9aa4af", fontSize: 14 },
  itemDetails: { marginTop: 10, display: "grid", gap: 6, color: "#c9d1d9", fontSize: 14 },
  actions: { marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" },
  badge: { fontSize: 12, borderRadius: 999, padding: "6px 10px", whiteSpace: "nowrap" },
  badgePending: { background: "#4a3412", color: "#ffd28b", border: "1px solid #7a5320" },
  badgeApproved: { background: "#163222", color: "#9fe3b4", border: "1px solid #28563a" },
};
