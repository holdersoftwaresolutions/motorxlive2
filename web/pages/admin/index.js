import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import EventCard from "../components/EventCard";

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [eventsData, setEventsData] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState({
    q: "",
    lat: "",
    lng: "",
    radiusMiles: "100",
  });

  async function loadDefault() {
    try {
      setLoading(true);
      setError("");

      const [categoriesRes, eventsRes] = await Promise.all([
        fetch("/api/public/categories"),
        fetch("/api/public/events?page=1&pageSize=12"),
      ]);

      const [categoriesJson, eventsJson] = await Promise.all([
        categoriesRes.json(),
        eventsRes.json(),
      ]);

      setCategories(Array.isArray(categoriesJson) ? categoriesJson : []);
      setEventsData(eventsJson || { items: [] });
    } catch {
      setError("Failed to load homepage content.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDefault();
  }, []);

  async function handleSearch(e) {
    e.preventDefault();

    try {
      setSearching(true);
      setError("");

      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "24");

      if (search.q) params.set("q", search.q);
      if (search.lat) params.set("lat", search.lat);
      if (search.lng) params.set("lng", search.lng);
      if (search.radiusMiles) params.set("radiusMiles", search.radiusMiles);

      const res = await fetch(`/api/public/events?${params.toString()}`);
      const json = await res.json();

      setEventsData(json || { items: [] });
    } catch {
      setError("Failed to search events.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <>
      <Head>
        <title>MotorXLive</title>
        <meta
          name="description"
          content="Watch motorsports events live and browse completed event videos."
        />
      </Head>

      <div style={styles.page}>
        <div style={styles.container}>
          <section style={styles.hero}>
            <p style={styles.eyebrow}>MotorXLive</p>
            <h1 style={styles.heroTitle}>Find events near you and watch them live.</h1>
            <p style={styles.heroSubtitle}>
              Search by keyword or location radius to find events, then jump into the live watch page.
            </p>
          </section>

          <section style={styles.searchPanel}>
            <h2 style={styles.sectionTitle}>Search Events by Location</h2>

            <form onSubmit={handleSearch} style={styles.searchForm}>
              <input
                style={styles.input}
                placeholder="Keyword (event, venue, city, state)"
                value={search.q}
                onChange={(e) => setSearch((s) => ({ ...s, q: e.target.value }))}
              />
              <input
                style={styles.input}
                type="number"
                step="any"
                placeholder="Latitude"
                value={search.lat}
                onChange={(e) => setSearch((s) => ({ ...s, lat: e.target.value }))}
              />
              <input
                style={styles.input}
                type="number"
                step="any"
                placeholder="Longitude"
                value={search.lng}
                onChange={(e) => setSearch((s) => ({ ...s, lng: e.target.value }))}
              />
              <input
                style={styles.input}
                type="number"
                placeholder="Radius (miles)"
                value={search.radiusMiles}
                onChange={(e) => setSearch((s) => ({ ...s, radiusMiles: e.target.value }))}
              />

              <div style={styles.searchActions}>
                <button type="submit" style={styles.button}>
                  {searching ? "Searching..." : "Search"}
                </button>

                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={loadDefault}
                >
                  Reset
                </button>
              </div>
            </form>
          </section>

          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Browse Categories</h2>
            </div>

            {loading ? (
              <p style={styles.mutedText}>Loading categories...</p>
            ) : categories.length === 0 ? (
              <p style={styles.mutedText}>No categories available yet.</p>
            ) : (
              <div style={styles.categoryGrid}>
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/categories/${category.slug}`}
                    style={styles.categoryCard}
                  >
                    <div style={styles.categoryName}>{category.name}</div>
                    <div style={styles.categoryMeta}>View events</div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Events</h2>
            </div>

            {loading ? (
              <p style={styles.mutedText}>Loading events...</p>
            ) : error ? (
              <p style={styles.errorText}>{error}</p>
            ) : !eventsData?.items?.length ? (
              <p style={styles.mutedText}>No events found.</p>
            ) : (
              <div style={styles.eventGrid}>
                {eventsData.items.map((event) => (
                  <div key={event.id}>
                    <EventCard event={event} />
                    {event.distanceMiles != null ? (
                      <p style={styles.distanceText}>
                        {event.distanceMiles.toFixed(1)} miles away
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
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
    maxWidth: 1200,
    margin: "0 auto",
    padding: "32px 20px 60px",
  },
  hero: {
    padding: "16px 0 24px",
  },
  eyebrow: {
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#8fb3ff",
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 42,
    lineHeight: 1.1,
    margin: "0 0 12px",
  },
  heroSubtitle: {
    maxWidth: 760,
    fontSize: 17,
    lineHeight: 1.6,
    color: "#c9d1d9",
    margin: 0,
  },
  searchPanel: {
    background: "#11161c",
    border: "1px solid #1f2937",
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
  },
  searchForm: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr",
    gap: 12,
    alignItems: "end",
  },
  input: {
    width: "100%",
    background: "#0f141a",
    border: "1px solid #2a3647",
    color: "#f5f7fa",
    borderRadius: 10,
    padding: "12px 14px",
  },
  searchActions: {
    display: "flex",
    gap: 10,
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
  section: {
    marginTop: 36,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    margin: 0,
  },
  categoryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  },
  categoryCard: {
    textDecoration: "none",
    color: "#f5f7fa",
    border: "1px solid #1f2937",
    background: "#11161c",
    borderRadius: 14,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 700,
  },
  categoryMeta: {
    fontSize: 14,
    color: "#9aa4af",
  },
  eventGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 18,
  },
  mutedText: {
    color: "#9aa4af",
  },
  errorText: {
    color: "#ff9b9b",
  },
  distanceText: {
    marginTop: 8,
    color: "#9aa4af",
    fontSize: 13,
  },
};