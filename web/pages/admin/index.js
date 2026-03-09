import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import EventCard from "../components/EventCard";

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [upcomingEventsData, setUpcomingEventsData] = useState({ items: [] });
  const [nearbyEventsData, setNearbyEventsData] = useState({ items: [] });

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [locating, setLocating] = useState(false);

  const [error, setError] = useState("");
  const [nearbyError, setNearbyError] = useState("");
  const [resolvedLocationLabel, setResolvedLocationLabel] = useState("");
  const [locationStatus, setLocationStatus] = useState("Trying to load nearby events from your location.");

  const [search, setSearch] = useState({
    q: "",
    locationText: "",
    lat: "",
    lng: "",
    radiusMiles: "100",
  });

  const [locationMode, setLocationMode] = useState("text"); // "text" | "device"

  async function loadDefault() {
    try {
      setLoading(true);
      setError("");

      const today = new Date().toISOString();

      const [categoriesRes, upcomingRes] = await Promise.all([
        fetch("/api/public/categories"),
        fetch(`/api/public/events?page=1&pageSize=12&from=${encodeURIComponent(today)}`),
      ]);

      const categoriesText = await categoriesRes.text();
      const upcomingText = await upcomingRes.text();

      if (!categoriesRes.ok) {
        throw new Error(`Categories request failed: ${categoriesText}`);
      }

      if (!upcomingRes.ok) {
        throw new Error(`Upcoming events request failed: ${upcomingText}`);
      }

      const categoriesJson = categoriesText ? JSON.parse(categoriesText) : [];
      const upcomingJson = upcomingText ? JSON.parse(upcomingText) : { items: [] };

      setCategories(Array.isArray(categoriesJson) ? categoriesJson : []);
      setUpcomingEventsData(upcomingJson || { items: [] });
    } catch (err) {
      setError(err.message || "Failed to load homepage content.");
    } finally {
      setLoading(false);
    }
  }

  async function resolveLocationTextToCoords(locationText) {
    const res = await fetch(`/api/public/geocode?q=${encodeURIComponent(locationText)}`);
    const text = await res.text();

    if (!res.ok) {
      throw new Error(text || "Failed to geocode location");
    }

    const json = text ? JSON.parse(text) : null;

    if (!json || json.ok === false) {
      throw new Error(json?.error || "Failed to geocode location");
    }

    return {
      lat: json.lat,
      lng: json.lng,
      displayName: json.displayName,
    };
  }

  async function loadNearbyEvents(lat, lng, radiusMiles = "100", q = "") {
    try {
      setLoadingNearby(true);
      setNearbyError("");

      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "12");
      params.set("lat", String(lat));
      params.set("lng", String(lng));
      params.set("radiusMiles", String(radiusMiles));

      if (q?.trim()) {
        params.set("q", q.trim());
      }

      const res = await fetch(`/api/public/events?${params.toString()}`);
      const text = await res.text();

      if (!res.ok) {
        throw new Error(text || "Failed to load nearby events");
      }

      const json = text ? JSON.parse(text) : { items: [] };
      setNearbyEventsData(json || { items: [] });
    } catch (err) {
      setNearbyError(err.message || "Failed to load nearby events.");
      setNearbyEventsData({ items: [] });
    } finally {
      setLoadingNearby(false);
    }
  }

  function getGeolocationErrorMessage(geoError) {
    if (!geoError) return "Unable to get your location.";

    switch (geoError.code) {
      case 1:
        return "Location access was denied. You can still search by city, state, or ZIP.";
      case 2:
        return "Your location could not be determined. Try again or search by city, state, or ZIP.";
      case 3:
        return "Location request timed out. Try again or search by city, state, or ZIP.";
      default:
        return "Unable to get your location. You can still search by city, state, or ZIP.";
    }
  }

  async function tryAutoLoadNearby() {
    if (typeof window === "undefined") return;
    if (!navigator.geolocation) {
      setNearbyError("Geolocation is not supported in this browser. Search by city, state, or ZIP.");
      setLocationStatus("Location search unavailable in this browser.");
      return;
    }

    setLocating(true);
    setLoadingNearby(true);
    setNearbyError("");
    setLocationStatus("Requesting location permission for nearby events...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = String(position.coords.latitude);
        const lng = String(position.coords.longitude);

        setLocationMode("device");
        setSearch((s) => ({
          ...s,
          lat,
          lng,
        }));
        setResolvedLocationLabel("Showing nearby events from your current location");
        setLocationStatus("Using your current location.");

        await loadNearbyEvents(lat, lng, search.radiusMiles || "100", search.q);
        setLocating(false);
      },
      (geoError) => {
        setNearbyError(getGeolocationErrorMessage(geoError));
        setLocationStatus("Location not available. Search manually instead.");
        setLoadingNearby(false);
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }

  useEffect(() => {
    loadDefault();
  }, []);

  useEffect(() => {
    tryAutoLoadNearby();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      setLocationStatus("Location search unavailable in this browser.");
      return;
    }

    setError("");
    setNearbyError("");
    setResolvedLocationLabel("");
    setLocating(true);
    setLocationStatus("Requesting your current location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLat = String(position.coords.latitude);
        const nextLng = String(position.coords.longitude);

        setLocationMode("device");
        setSearch((s) => ({
          ...s,
          lat: nextLat,
          lng: nextLng,
        }));
        setResolvedLocationLabel("Using your current location");
        setLocationStatus("Using your current location.");

        await loadNearbyEvents(nextLat, nextLng, search.radiusMiles || "100", search.q);
        setLocating(false);
      },
      (geoError) => {
        setError(getGeolocationErrorMessage(geoError));
        setLocationStatus("Location not available. Search by city, state, or ZIP instead.");
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }

  async function handleSearch(e) {
    e.preventDefault();

    try {
      setSearching(true);
      setError("");
      setNearbyError("");
      setResolvedLocationLabel("");

      let lat = search.lat;
      let lng = search.lng;
      let displayName = "";

      if (search.locationText.trim()) {
        const resolved = await resolveLocationTextToCoords(search.locationText.trim());
        lat = String(resolved.lat);
        lng = String(resolved.lng);
        displayName = resolved.displayName || search.locationText.trim();

        setLocationMode("text");
        setSearch((s) => ({
          ...s,
          lat,
          lng,
        }));
      }

      if (lat && lng) {
        await loadNearbyEvents(lat, lng, search.radiusMiles || "100", search.q);

        if (displayName) {
          setResolvedLocationLabel(`Searching near ${displayName}`);
          setLocationStatus(`Resolved location: ${displayName}`);
        } else if (locationMode === "device") {
          setResolvedLocationLabel("Searching near your current location");
          setLocationStatus("Using your current location.");
        }
      } else {
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("pageSize", "24");

        if (search.q.trim()) {
          params.set("q", search.q.trim());
        }

        const res = await fetch(`/api/public/events?${params.toString()}`);
        const text = await res.text();

        if (!res.ok) {
          throw new Error(text || "Failed to search events");
        }

        const json = text ? JSON.parse(text) : { items: [] };
        setUpcomingEventsData(json || { items: [] });
      }
    } catch (err) {
      setError(err.message || "Failed to search events.");
    } finally {
      setSearching(false);
    }
  }

  function handleReset() {
    setSearch({
      q: "",
      locationText: "",
      lat: "",
      lng: "",
      radiusMiles: "100",
    });
    setLocationMode("text");
    setResolvedLocationLabel("");
    setNearbyError("");
    setLocationStatus("Trying to load nearby events from your location.");
    setNearbyEventsData({ items: [] });
    loadDefault();
    tryAutoLoadNearby();
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
              Search by keyword, use your current location, or enter a city, state, or ZIP code to find events within a radius.
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
                placeholder="City, State or ZIP"
                value={search.locationText}
                onChange={(e) => {
                  setLocationMode("text");
                  setResolvedLocationLabel("");
                  setSearch((s) => ({
                    ...s,
                    locationText: e.target.value,
                  }));
                }}
              />

              <input
                style={styles.input}
                type="number"
                placeholder="Radius (miles)"
                value={search.radiusMiles}
                onChange={(e) => setSearch((s) => ({ ...s, radiusMiles: e.target.value }))}
              />

              <div style={styles.searchActions}>
                <button
                  type="button"
                  style={{
                    ...styles.secondaryButton,
                    ...(locating ? styles.buttonDisabled : {}),
                  }}
                  onClick={handleUseMyLocation}
                  disabled={locating}
                >
                  {locating ? "Locating..." : "Use My Location"}
                </button>

                <button
                  type="submit"
                  style={{
                    ...styles.button,
                    ...(searching ? styles.buttonDisabled : {}),
                  }}
                  disabled={searching}
                >
                  {searching ? "Searching..." : "Search"}
                </button>

                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={handleReset}
                >
                  Reset
                </button>
              </div>
            </form>

            <p style={styles.locationStatus}>{locationStatus}</p>

            {resolvedLocationLabel ? (
              <p style={styles.locationHint}>{resolvedLocationLabel}</p>
            ) : null}

            {search.lat && search.lng ? (
              <p style={styles.coordsHint}>
                Coordinates ready: {search.lat}, {search.lng}
              </p>
            ) : null}
          </section>

          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Nearby Events</h2>
            </div>

            {loadingNearby ? (
              <p style={styles.mutedText}>Loading nearby events...</p>
            ) : nearbyError ? (
              <p style={styles.errorText}>{nearbyError}</p>
            ) : !nearbyEventsData?.items?.length ? (
              <p style={styles.mutedText}>No nearby events found yet.</p>
            ) : (
              <div style={styles.eventGrid}>
                {nearbyEventsData.items.map((event) => (
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

          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Upcoming Events</h2>
            </div>

            {loading ? (
              <p style={styles.mutedText}>Loading upcoming events...</p>
            ) : error ? (
              <p style={styles.errorText}>{error}</p>
            ) : !upcomingEventsData?.items?.length ? (
              <p style={styles.mutedText}>No upcoming events found.</p>
            ) : (
              <div style={styles.eventGrid}>
                {upcomingEventsData.items.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
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
    gridTemplateColumns: "2fr 1.4fr 180px auto",
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
    flexWrap: "wrap",
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
    opacity: 0.7,
    cursor: "not-allowed",
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
  locationHint: {
    marginTop: 12,
    color: "#8fd19e",
    fontSize: 14,
  },
  coordsHint: {
    marginTop: 8,
    color: "#9aa4af",
    fontSize: 13,
  },
  locationStatus: {
    marginTop: 12,
    color: "#c9d1d9",
    fontSize: 14,
  },
};