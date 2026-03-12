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

export default function DevControlPage() {
  const [categories, setCategories] = useState([]);
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");

  const selectedEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

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

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <p style={styles.eyebrow}>MotorXLive</p>
          <h1 style={styles.title}>Dev Control Panel</h1>
          <p style={styles.subtitle}>
            Development-only page for seeding and testing.
          </p>
        </div>

        {message ? <div style={styles.message}>{message}</div> : null}

        <div style={styles.card}>
          <div><strong>Categories:</strong> {categories.length}</div>
          <div><strong>Events:</strong> {events.length}</div>
          <div><strong>Selected Category:</strong> {selectedCategoryId || "None"}</div>
          <div><strong>Selected Event:</strong> {selectedEvent?.title || "None"}</div>
        </div>

        <button style={styles.button} onClick={loadData} disabled={loading}>
          {loading ? "Refreshing..." : "Reload Data"}
        </button>
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
    maxWidth: 1100,
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
  card: {
    background: "#11161c",
    border: "1px solid #1f2937",
    borderRadius: 14,
    padding: 18,
    display: "grid",
    gap: 8,
    marginBottom: 16,
  },
  button: {
    background: "#2563eb",
    color: "#fff",
    border: 0,
    borderRadius: 10,
    padding: "12px 14px",
    cursor: "pointer",
  },
};