import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import EventCard from "../components/EventCard";

function newSessionToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [upcomingEventsData, setUpcomingEventsData] = useState({ items: [] });
  const [nearbyEventsData, setNearbyEventsData] = useState({ items: [] });

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [locating, setLocating] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const [error, setError] = useState("");
  const [nearbyError, setNearbyError] = useState("");
  const [resolvedLocationLabel, setResolvedLocationLabel] = useState("");
  const [locationStatus, setLocationStatus] = useState(
    "Trying to load nearby events from your location."
  );

  const [search, setSearch] = useState({
    q: "",
    locationText: "",
    lat: "",
    lng: "",
    radiusMiles: "100",
  });

  const [locationMode, setLocationMode] = useState("text");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const debounceRef = useRef(null);
  const sessionTokenRef = useRef(newSessionToken());

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
      setNearbyError(
        "Geolocation is not supported in this browser. Search by city, state, or ZIP."
      );
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

  async function fetchSuggestions(value) {
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setSuggesting(true);

      const params = new URLSearchParams();
      params.set("q", value.trim());
      params.set("sessionToken", sessionTokenRef.current);

      const res = await fetch(`/api/public/location/suggest?${params.toString()}`);
      const text = await res.text();

      if (!res.ok) {
        throw new Error(text || "Failed to load location suggestions");
      }

      const json = text ? JSON.parse(text) : { suggestions: [] };
      const list = Array.isArray(json.suggestions) ? json.suggestions : [];

      setSuggestions(list);
      setShowSuggestions(list.length > 0);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setSuggesting(false);
    }
  }

  function handleLocationInputChange(value) {
    setLocationMode("text");
    setResolvedLocationLabel("");
    setSearch((s) => ({
      ...s,
      locationText: value,
    }));

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 250);
  }

  async function handleSuggestionSelect(suggestion) {
    try {
      setSuggesting(true);
      setShowSuggestions(false);

      const params = new URLSearchParams();
      params.set("mapboxId", suggestion.mapboxId);
      params.set("sessionToken", sessionTokenRef.current);

      const res = await fetch(`/api/public/location/retrieve?${params.toString()}`);
      const text = await res.text();

      if (!res.ok) {
        throw new Error(text || "Failed to retrieve location");
      }

      const json = text ? JSON.parse(text) : null;

      if (!json || json.ok === false) {
        throw new Error(json?.error || "Failed to retrieve location");
      }

      setSearch((s) => ({
        ...s,
        locationText:
          suggestion.fullAddress || suggestion.placeFormatted || suggestion.name,
        lat: String(json.lat),
        lng: String(json.lng),
      }));

      setResolvedLocationLabel(`Searching near ${json.displayName}`);
      sessionTokenRef.current = newSessionToken();
    } catch (err) {
      setError(err.message || "Failed to select location");
    } finally {
      setSuggesting(false);
    }
  }

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
        setLocationStatus(
          "Location not available. Search by city, state, or ZIP instead."
        );
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

      const lat = search.lat;
      const lng = search.lng;

      if (lat && lng) {
        await loadNearbyEvents(lat, lng, search.radiusMiles || "100", search.q);

        if (locationMode === "device") {
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
    setSuggestions([]);
    setShowSuggestions(false);
    setNearbyEventsData({ items: [] });
    sessionTokenRef.current = newSessionToken();
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
              Search by keyword, use your current location, or enter a city, state,
              or ZIP code to find events within a radius.
            </p>
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
              <h2 style={styles.sectionTitle}>For Streamers & Media</h2>
            </div>

            <div style={styles.contributorGrid}>
              <Link href="/admin/login" style={styles.contributorCard}>
                <div style={styles.contributorTitle}>Contributor Login</div>
                <div style={styles.contributorText}>
                  Log in to add or manage live streams and event videos.
                </div>
              </Link>

              <Link href="/admin/streams" style={styles.contributorCard}>
                <div style={styles.contributorTitle}>Add Live Stream</div>
                <div style={styles.contributorText}>
                  Attach livestream sources to events and manage playback details.
                </div>
              </Link>

              <Link href="/admin/videos" style={styles.contributorCard}>
                <div style={styles.contributorTitle}>Add Video</div>
                <div style={styles.contributorText}>
                  Publish completed videos and on-demand event content.
                </div>
              </Link>
            </div>
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

              <div style={styles.autocompleteWrap}>
                <input
                  style={styles.input}
                  placeholder="City, State or ZIP"
                  value={search.locationText}
                  onChange={(e) => handleLocationInputChange(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                />

                {suggesting ? (
                  <div style={styles.suggestLoading}>Loading suggestions...</div>
                ) : null}

                {showSuggestions && suggestions.length > 0 ? (
                  <div style={styles.suggestions}>
                    {suggestions.map((item) => (
                      <button
                        key={item.mapboxId}
                        type="button"
                        style={styles.suggestionItem}
                        onClick={() => handleSuggestionSelect(item)}
                      >
                        <div style={styles.suggestionTitle}>{item.name}</div>
                        <div style={styles.suggestionMeta}>
                          {item.fullAddress || item.placeFormatted}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <input
                style={styles.input}
                type="number"
                placeholder="Radius (miles)"
                value={search.radiusMiles}
                onChange={(e) =>
                  setSearch((s) => ({ ...s, radiusMiles: e.target.value }))
                }
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
  contributorGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 14,
  },
  contributorCard: {
    textDecoration: "none",
    color: "#f5f7fa",
    border: "1px solid #1f2937",
    background: "#11161c",
    borderRadius: 14,
    padding: 18,
    display: "grid",
    gap: 10,
  },
  contributorTitle: {
    fontSize: 18,
    fontWeight: 700,
  },
  contributorText: {
    fontSize: 14,
    color: "#c9d1d9",
    lineHeight: 1.5,
  },
  searchPanel: {
    background: "#11161c",
    border: "1px solid #1f2937",
    borderRadius: 16,
    padding: 20,
    marginTop: 36,
  },
  searchForm: {
    display: "grid",
    gridTemplateColumns: "2fr 1.6fr 180px auto",
    gap: 12,
    alignItems: "start",
  },
  input: {
    width: "100%",
    background: "#0f141a",
    border: "1px solid #2a3647",
    color: "#f5f7fa",
    borderRadius: 10,
    padding: "12px 14px",
  },
  autocompleteWrap: {
    position: "relative",
  },
  suggestions: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    right: 0,
    background: "#11161c",
    border: "1px solid #2a3647",
    borderRadius: 12,
    overflow: "hidden",
    zIndex: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  },
  suggestionItem: {
    width: "100%",
    textAlign: "left",
    background: "transparent",
    color: "#f5f7fa",
    border: 0,
    borderBottom: "1px solid #1f2937",
    padding: "12px 14px",
    cursor: "pointer",
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 4,
  },
  suggestionMeta: {
    fontSize: 12,
    color: "#9aa4af",
  },
  suggestLoading: {
    marginTop: 8,
    color: "#9aa4af",
    fontSize: 12,
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