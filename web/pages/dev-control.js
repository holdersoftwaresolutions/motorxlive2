import { useEffect, useMemo, useState } from "react";

export async function getServerSideProps() {
  if (process.env.NODE_ENV === "production") {
    return {
      notFound: true,
    };
  }

  return {
    props: {},
  };
}

if (process.env.NODE_ENV === "production") {
  return (
    <div style={{padding:40}}>
      <h1>Not Found</h1>
    </div>
  )
}

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
  }, []);

  const selectedEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <p style={styles.eyebrow}>MotorXLive</p>
            <h1 style={styles.title}>Dev Control Panel</h1>
            <p style={styles.subtitle}>
              Quickly seed categories, events, streams, videos, and test location-aware content.
            </p>
          </div>
        </div>

        {message ? <div style={styles.message}>{message}</div> : null}

        {selectedEvent ? (
          <div style={styles.selectedBox}>
            <div><strong>Selected Event:</strong> {selectedEvent.title}</div>
            <div><strong>Slug:</strong> {selectedEvent.slug}</div>
          </div>
        ) : null}
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
};