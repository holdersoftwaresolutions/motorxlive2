import { useEffect, useMemo, useState } from "react";

export default function DevControlPage() {
  const [categories, setCategories] = useState([]);
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");

  const [eventForm, setEventForm] = useState({
    title: "Spring Drag Classic",
    slug: "spring-drag-classic",
    description: "Weekend drag racing event",
    startAt: "2026-03-20T18:00",
    endAt: "2026-03-22T03:00",
    venueName: "Example Motorsports Park",
    addressLine1: "123 Track Lane",
    city: "Huntsville",
    state: "AL",
    postalCode: "35801",
    country: "US",
    latitude: "34.7304",
    longitude: "-86.5861",
    heroImageUrl: "",
  });

  const [streamForm, setStreamForm] = useState({
    sourceType: "YOUTUBE",
    provider: "custom",
    title: "Main Live Feed",
    isPrimary: true,
    priority: 0,
    youtubeVideoId: "dQw4w9WgXcQ",
    playbackHlsUrl: "",
    playbackDashUrl: "",
    lifecycle: "LIVE",
  });

  const [videoForm, setVideoForm] = useState({
    sourceType: "YOUTUBE",
    provider: "custom",
    title: "Feature Replay",
    description: "Replay of the feature event",
    youtubeVideoId: "dQw4w9WgXcQ",
    playbackHlsUrl: "",
    playbackDashUrl: "",
    durationSeconds: "600",
    status: "READY",
    publishedAt: "2026-03-22T10:00",
  });

  async function parseResponse(res) {
    const text = await res.text();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async function api(path, options = {}) {
    const res = await fetch(path, options);
    const data = await parseResponse(res);

    if (!res.ok) {
      const msg =
        typeof data === "string"
          ? data
          : data?.error || data?.message || `Request failed: ${res.status}`;
      throw new Error(msg);
    }

    return data;
  }

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");

      const [categoryList, eventList] = await Promise.all([
        api("/api/admin/categories"),
        api("/api/admin/events"),
      ]);

      const safeCategories = Array.isArray(categoryList) ? categoryList : [];
      const safeEvents = Array.isArray(eventList) ? eventList : [];

      setCategories(safeCategories);
      setEvents(safeEvents);

      if (!selectedCategoryId && safeCategories.length > 0) {
        setSelectedCategoryId(safeCategories[0].id);
      }

      if (!selectedEventId && safeEvents.length > 0) {
        setSelectedEventId(safeEvents[0].id);
      }
    } catch (err) {
      setMessage(err.message || "Failed to load dev data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  async function ensureCategory(name, slug, sortOrder = 1) {
    const existing = categories.find((c) => c.slug === slug);
    if (existing) return existing;

    const created = await api("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, sortOrder }),
    });

    return created;
  }

  async function createSeedCategory() {
    try {
      setLoading(true);
      setMessage("");

      const created = await ensureCategory("Drag Racing", "drag", 1);
      setSelectedCategoryId(created.id);

      setMessage("Seed category created or reused.");
      await loadData();
    } catch (err) {
      setMessage(err.message || "Failed to create seed category.");
    } finally {
      setLoading(false);
    }
  }

  async function createSecondCategory() {
    try {
      setLoading(true);
      setMessage("");

      const created = await ensureCategory("Motocross", "motocross", 2);
      setSelectedCategoryId(created.id);

      setMessage("Motocross category created or reused.");
      await loadData();
    } catch (err) {
      setMessage(err.message || "Failed to create category.");
    } finally {
      setLoading(false);
    }
  }

  async function createEvent() {
    try {
      setLoading(true);
      setMessage("");

      if (!selectedCategoryId) {
        throw new Error("Select or create a category first.");
      }

      const created = await api("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...eventForm,
          categoryId: selectedCategoryId,
          latitude: eventForm.latitude ? Number(eventForm.latitude) : undefined,
          longitude: eventForm.longitude ? Number(eventForm.longitude) : undefined,
          startAt: eventForm.startAt ? new Date(eventForm.startAt).toISOString() : undefined,
          endAt: eventForm.endAt ? new Date(eventForm.endAt).toISOString() : undefined,
        }),
      });

      setSelectedEventId(created?.id || "");
      setMessage("Event created.");
      await loadData();
    } catch (err) {
      setMessage(err.message || "Failed to create event.");
    } finally {
      setLoading(false);
    }
  }

  async function createStreamForEvent(eventId) {
    return api(`/api/admin/events/${eventId}/streams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...streamForm,
        priority: Number(streamForm.priority || 0),
      }),
    });
  }

  async function createStream() {
    try {
      setLoading(true);
      setMessage("");

      if (!selectedEventId) {
        throw new Error("Select an event first.");
      }

      await createStreamForEvent(selectedEventId);
      setMessage("Stream created.");
    } catch (err) {
      setMessage(err.message || "Failed to create stream.");
    } finally {
      setLoading(false);
    }
  }

  async function createVideoForEvent(eventId) {
    return api(`/api/admin/events/${eventId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...videoForm,
        durationSeconds: videoForm.durationSeconds
          ? Number(videoForm.durationSeconds)
          : undefined,
        publishedAt: videoForm.publishedAt
          ? new Date(videoForm.publishedAt).toISOString()
          : undefined,
      }),
    });
  }

  async function createVideo() {
    try {
      setLoading(true);
      setMessage("");

      if (!selectedEventId) {
        throw new Error("Select an event first.");
      }

      await createVideoForEvent(selectedEventId);
      setMessage("Video created.");
    } catch (err) {
      setMessage(err.message || "Failed to create video.");
    } finally {
      setLoading(false);
    }
  }

  async function seedAll() {
    try {
      setLoading(true);
      setMessage("Seeding category, event, stream, and video...");

      const category = await ensureCategory("Drag Racing", "drag", 1);
      setSelectedCategoryId(category.id);

      const createdEvent = await api("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...eventForm,
          categoryId: category.id,
          latitude: eventForm.latitude ? Number(eventForm.latitude) : undefined,
          longitude: eventForm.longitude ? Number(eventForm.longitude) : undefined,
          startAt: eventForm.startAt ? new Date(eventForm.startAt).toISOString() : undefined,
          endAt: eventForm.endAt ? new Date(eventForm.endAt).toISOString() : undefined,
        }),
      });

      const eventId = createdEvent?.id;
      if (!eventId) {
        throw new Error("Event was created without an ID.");
      }

      await createStreamForEvent(eventId);
      await createVideoForEvent(eventId);

      setSelectedEventId(eventId);
      setMessage("Seed all complete: category, event, stream, and video created.");
      await loadData();
    } catch (err) {
      setMessage(err.message || "Failed to seed all test content.");
    } finally {
      setLoading(false);
    }
  }

  async function reloadEverything() {
    await loadData();
    setMessage("Dev data refreshed.");
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <p style={styles.eyebrow}>MotorXLive</p>
            <h1 style={styles.title}>Dev Control Panel</h1>
            <p style={styles.subtitle}>
              Quickly seed categories, events, streams, videos, and test
              location-aware content without bouncing around the admin UI.
            </p>
          </div>
        </div>

        {message ? <div style={styles.message}>{message}</div> : null}

        <div style={styles.topActions}>
          <button style={styles.button} onClick={seedAll} disabled={loading}>
            {loading ? "Working..." : "Seed All Test Content"}
          </button>

          <button style={styles.secondaryButton} onClick={reloadEverything} disabled={loading}>
            {loading ? "Working..." : "Reload Data"}
          </button>

          <a href="/" style={styles.linkButton}>
            Open Homepage
          </a>

          <a href="/admin" style={styles.linkButton}>
            Open Admin
          </a>
        </div>

        <div style={styles.grid}>
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>1. Seed Categories</h2>

            <div style={styles.buttonRow}>
              <button style={styles.button} onClick={createSeedCategory} disabled={loading}>
                Create Drag Racing
              </button>

              <button style={styles.button} onClick={createSecondCategory} disabled={loading}>
                Create Motocross
              </button>
            </div>

            <div style={styles.fieldBlock}>
              <label style={styles.label}>Current Categories</label>
              <select
                style={styles.input}
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.slug})
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>2. Create Event</h2>

            <div style={styles.formGrid}>
              <input
                style={styles.input}
                value={eventForm.title}
                onChange={(e) => setEventForm((s) => ({ ...s, title: e.target.value }))}
                placeholder="Title"
              />
              <input
                style={styles.input}
                value={eventForm.slug}
                onChange={(e) => setEventForm((s) => ({ ...s, slug: e.target.value }))}
                placeholder="Slug"
              />
              <input
                style={styles.input}
                value={eventForm.venueName}
                onChange={(e) => setEventForm((s) => ({ ...s, venueName: e.target.value }))}
                placeholder="Venue Name"
              />
              <input
                style={styles.input}
                value={eventForm.addressLine1}
                onChange={(e) => setEventForm((s) => ({ ...s, addressLine1: e.target.value }))}
                placeholder="Address"
              />
              <input
                style={styles.input}
                value={eventForm.city}
                onChange={(e) => setEventForm((s) => ({ ...s, city: e.target.value }))}
                placeholder="City"
              />
              <input
                style={styles.input}
                value={eventForm.state}
                onChange={(e) => setEventForm((s) => ({ ...s, state: e.target.value }))}
                placeholder="State"
              />
              <input
                style={styles.input}
                value={eventForm.postalCode}
                onChange={(e) => setEventForm((s) => ({ ...s, postalCode: e.target.value }))}
                placeholder="ZIP"
              />
              <input
                style={styles.input}
                value={eventForm.country}
                onChange={(e) => setEventForm((s) => ({ ...s, country: e.target.value }))}
                placeholder="Country"
              />
              <input
                style={styles.input}
                type="datetime-local"
                value={eventForm.startAt}
                onChange={(e) => setEventForm((s) => ({ ...s, startAt: e.target.value }))}
              />
              <input
                style={styles.input}
                type="datetime-local"
                value={eventForm.endAt}
                onChange={(e) => setEventForm((s) => ({ ...s, endAt: e.target.value }))}
              />
              <input
                style={styles.input}
                type="number"
                step="any"
                value={eventForm.latitude}
                onChange={(e) => setEventForm((s) => ({ ...s, latitude: e.target.value }))}
                placeholder="Latitude"
              />
              <input
                style={styles.input}
                type="number"
                step="any"
                value={eventForm.longitude}
                onChange={(e) => setEventForm((s) => ({ ...s, longitude: e.target.value }))}
                placeholder="Longitude"
              />
              <input
                style={styles.input}
                value={eventForm.heroImageUrl}
                onChange={(e) => setEventForm((s) => ({ ...s, heroImageUrl: e.target.value }))}
                placeholder="Flyer URL (optional)"
              />
              <textarea
                style={styles.textarea}
                value={eventForm.description}
                onChange={(e) => setEventForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="Description"
              />
            </div>

            <button style={styles.button} onClick={createEvent} disabled={loading}>
              Create Event
            </button>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>3. Select Event</h2>

            <select
              style={styles.input}
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              <option value="">Select event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>

            {selectedEvent ? (
              <div style={styles.selectedBox}>
                <div><strong>Slug:</strong> {selectedEvent.slug}</div>
                <div><strong>City:</strong> {selectedEvent.city || "—"}</div>
                <div><strong>State:</strong> {selectedEvent.state || "—"}</div>
                <div><strong>Coords:</strong> {selectedEvent.latitude ?? "—"}, {selectedEvent.longitude ?? "—"}</div>
                <div style={styles.quickLinks}>
                  <a href={`/events/${selectedEvent.slug}`} style={styles.inlineLink}>
                    Open Watch Page
                  </a>
                  <a
                    href={`/api/public/events/${selectedEvent.slug}/live`}
                    style={styles.inlineLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Live API
                  </a>
                </div>
              </div>
            ) : (
              <p style={styles.helper}>Create or choose an event first.</p>
            )}
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>4. Create Stream</h2>

            <div style={styles.formGrid}>
              <select
                style={styles.input}
                value={streamForm.sourceType}
                onChange={(e) => setStreamForm((s) => ({ ...s, sourceType: e.target.value }))}
              >
                <option value="YOUTUBE">YOUTUBE</option>
                <option value="EXTERNAL_HLS">EXTERNAL_HLS</option>
                <option value="MANAGED_LIVE">MANAGED_LIVE</option>
              </select>

              <input
                style={styles.input}
                value={streamForm.title}
                onChange={(e) => setStreamForm((s) => ({ ...s, title: e.target.value }))}
                placeholder="Stream Title"
              />

              <input
                style={styles.input}
                value={streamForm.youtubeVideoId}
                onChange={(e) => setStreamForm((s) => ({ ...s, youtubeVideoId: e.target.value }))}
                placeholder="YouTube Video ID"
              />

              <input
                style={styles.input}
                value={streamForm.playbackHlsUrl}
                onChange={(e) => setStreamForm((s) => ({ ...s, playbackHlsUrl: e.target.value }))}
                placeholder="HLS URL"
              />

              <input
                style={styles.input}
                value={streamForm.playbackDashUrl}
                onChange={(e) => setStreamForm((s) => ({ ...s, playbackDashUrl: e.target.value }))}
                placeholder="DASH URL"
              />

              <input
                style={styles.input}
                type="number"
                value={streamForm.priority}
                onChange={(e) => setStreamForm((s) => ({ ...s, priority: e.target.value }))}
                placeholder="Priority"
              />

              <select
                style={styles.input}
                value={streamForm.lifecycle}
                onChange={(e) => setStreamForm((s) => ({ ...s, lifecycle: e.target.value }))}
              >
                <option value="CREATED">CREATED</option>
                <option value="READY">READY</option>
                <option value="LIVE">LIVE</option>
                <option value="ENDED">ENDED</option>
                <option value="DISABLED">DISABLED</option>
                <option value="ERROR">ERROR</option>
              </select>

              <label style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={streamForm.isPrimary}
                  onChange={(e) => setStreamForm((s) => ({ ...s, isPrimary: e.target.checked }))}
                />
                Primary stream
              </label>
            </div>

            <button style={styles.button} onClick={createStream} disabled={loading}>
              Create Stream
            </button>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>5. Create Video</h2>

            <div style={styles.formGrid}>
              <select
                style={styles.input}
                value={videoForm.sourceType}
                onChange={(e) => setVideoForm((s) => ({ ...s, sourceType: e.target.value }))}
              >
                <option value="YOUTUBE">YOUTUBE</option>
                <option value="EXTERNAL_HLS">EXTERNAL_HLS</option>
                <option value="MANAGED_VOD">MANAGED_VOD</option>
              </select>

              <input
                style={styles.input}
                value={videoForm.title}
                onChange={(e) => setVideoForm((s) => ({ ...s, title: e.target.value }))}
                placeholder="Video Title"
              />

              <input
                style={styles.input}
                value={videoForm.youtubeVideoId}
                onChange={(e) => setVideoForm((s) => ({ ...s, youtubeVideoId: e.target.value }))}
                placeholder="YouTube Video ID"
              />

              <input
                style={styles.input}
                value={videoForm.playbackHlsUrl}
                onChange={(e) => setVideoForm((s) => ({ ...s, playbackHlsUrl: e.target.value }))}
                placeholder="HLS URL"
              />

              <input
                style={styles.input}
                value={videoForm.playbackDashUrl}
                onChange={(e) => setVideoForm((s) => ({ ...s, playbackDashUrl: e.target.value }))}
                placeholder="DASH URL"
              />

              <input
                style={styles.input}
                type="number"
                value={videoForm.durationSeconds}
                onChange={(e) => setVideoForm((s) => ({ ...s, durationSeconds: e.target.value }))}
                placeholder="Duration Seconds"
              />

              <input
                style={styles.input}
                type="datetime-local"
                value={videoForm.publishedAt}
                onChange={(e) => setVideoForm((s) => ({ ...s, publishedAt: e.target.value }))}
              />

              <select
                style={styles.input}
                value={videoForm.status}
                onChange={(e) => setVideoForm((s) => ({ ...s, status: e.target.value }))}
              >
                <option value="PROCESSING">PROCESSING</option>
                <option value="READY">READY</option>
                <option value="FAILED">FAILED</option>
                <option value="DISABLED">DISABLED</option>
              </select>

              <textarea
                style={styles.textarea}
                value={videoForm.description}
                onChange={(e) => setVideoForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="Video Description"
              />
            </div>

            <button style={styles.button} onClick={createVideo} disabled={loading}>
              Create Video
            </button>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>6. Useful Test URLs</h2>

            <div style={styles.urlList}>
              <a href="/api/public/categories" target="_blank" rel="noreferrer" style={styles.inlineLink}>
                /api/public/categories
              </a>
              <a href="/api/public/events" target="_blank" rel="noreferrer" style={styles.inlineLink}>
                /api/public/events
              </a>
              <a href="/api/public/live" target="_blank" rel="noreferrer" style={styles.inlineLink}>
                /api/public/live
              </a>
              {selectedEvent?.slug ? (
                <>
                  <a
                    href={`/api/public/events/${selectedEvent.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.inlineLink}
                  >
                    /api/public/events/{selectedEvent.slug}
                  </a>
                  <a
                    href={`/api/public/events/${selectedEvent.slug}/live`}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.inlineLink}
                  >
                    /api/public/events/{selectedEvent.slug}/live
                  </a>
                  <a
                    href={`/events/${selectedEvent.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.inlineLink}
                  >
                    /events/{selectedEvent.slug}
                  </a>
                </>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0b0d10",
    color: "#f5f7fa",
    fontFamily: "system-ui",
  },
  container: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "32px 20px 60px",
  },
  header: {
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#8fb3ff",
    marginBottom: 10,
  },
  title: {
    fontSize: 40,
    lineHeight: 1.1,
    margin: "0 0 12px",
  },
  subtitle: {
    maxWidth: 850,
    fontSize: 16,
    lineHeight: 1.6,
    color: "#c9d1d9",
    margin: 0,
  },
  message: {
    marginBottom: 18,
    background: "#162235",
    border: "1px solid #31598b",
    color: "#dbeafe",
    borderRadius: 12,
    padding: "12px 14px",
  },
  topActions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 22,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: 20,
  },
  card: {
    background: "#11161c",
    border: "1px solid #1f2937",
    borderRadius: 16,
    padding: 18,
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: 14,
    fontSize: 22,
  },
  fieldBlock: {
    marginTop: 14,
  },
  label: {
    display: "block",
    marginBottom: 8,
    color: "#c9d1d9",
    fontSize: 14,
  },
  formGrid: {
    display: "grid",
    gap: 10,
    marginBottom: 14,
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
  buttonRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 14,
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
    textDecoration: "none",
  },
  linkButton: {
    background: "#1b2a40",
    color: "#fff",
    border: "1px solid #31598b",
    borderRadius: 10,
    padding: "12px 14px",
    textDecoration: "none",
    display: "inline-block",
  },
  helper: {
    color: "#9aa4af",
    fontSize: 14,
  },
  selectedBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    background: "#0f141a",
    border: "1px solid #243041",
    display: "grid",
    gap: 8,
    color: "#c9d1d9",
    fontSize: 14,
  },
  quickLinks: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 4,
  },
  inlineLink: {
    color: "#8fb3ff",
    textDecoration: "none",
  },
  urlList: {
    display: "grid",
    gap: 10,
  },
  checkboxRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    color: "#dbe5f0",
    fontSize: 14,
  },
};