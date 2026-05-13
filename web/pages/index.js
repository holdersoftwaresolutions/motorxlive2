import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import EventCard from "../components/EventCard";
import { BRAND, brandStyles } from "../lib/brand";

const LOGO_SRC = "/branding/motorxlive-logo-bg.png";

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

      if (!categoriesRes.ok) throw new Error(`Categories request failed: ${categoriesText}`);
      if (!upcomingRes.ok) throw new Error(`Upcoming events request failed: ${upcomingText}`);

      setCategories(categoriesText ? JSON.parse(categoriesText) : []);
      setUpcomingEventsData(upcomingText ? JSON.parse(upcomingText) : { items: [] });
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
      if (q?.trim()) params.set("q", q.trim());

      const res = await fetch(`/api/public/events?${params.toString()}`);
      const text = await res.text();

      if (!res.ok) throw new Error(text || "Failed to load nearby events");

      setNearbyEventsData(text ? JSON.parse(text) : { items: [] });
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
        setSearch((s) => ({ ...s, lat, lng }));
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

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/public/events?page=1&pageSize=12");
        const data = await res.json();

        if (data?.items) {
          setNearbyEventsData((prev) => ({
            ...prev,
            items: data.items,
          }));
        }
      } catch (err) {
        console.error("Auto-refresh failed", err);
      }
    }, 30000);

    return () => clearInterval(interval);
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

      if (!res.ok) throw new Error(text || "Failed to load location suggestions");

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
    setSearch((s) => ({ ...s, locationText: value }));

    if (debounceRef.current) clearTimeout(debounceRef.current);

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

      if (!res.ok) throw new Error(text || "Failed to retrieve location");

      const json = text ? JSON.parse(text) : null;
      if (!json || json.ok === false) throw new Error(json?.error || "Failed to retrieve location");

      setSearch((s) => ({
        ...s,
        locationText: suggestion.fullAddress || suggestion.placeFormatted || suggestion.name,
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
        setSearch((s) => ({ ...s, lat: nextLat, lng: nextLng }));
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
        if (search.q.trim()) params.set("q", search.q.trim());

        const res = await fetch(`/api/public/events?${params.toString()}`);
        const text = await res.text();

        if (!res.ok) throw new Error(text || "Failed to search events");

        setUpcomingEventsData(text ? JSON.parse(text) : { items: [] });
      }
    } catch (err) {
      setError(err.message || "Failed to search events.");
    } finally {
      setSearching(false);
    }
  }

  function hasLiveStream(event) {
    const streams = event.streams || event.liveStreams || [];
    return streams.some(
      (stream) => stream.lifecycle === "LIVE" && stream.moderationStatus === "APPROVED"
    );
  }

  function sortEventsLiveFirst(events = []) {
    return [...events].sort((a, b) => {
      const aLive = hasLiveStream(a);
      const bLive = hasLiveStream(b);

      if (aLive && !bLive) return -1;
      if (!aLive && bLive) return 1;

      const aStart = a.startAt ? new Date(a.startAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bStart = b.startAt ? new Date(b.startAt).getTime() : Number.MAX_SAFE_INTEGER;

      return aStart - bStart;
    });
  }

  function getLiveEvents() {
    const allEvents = [
      ...(nearbyEventsData?.items || []),
      ...(upcomingEventsData?.items || []),
    ];

    const unique = new Map();

    allEvents.forEach((event) => {
      if (hasLiveStream(event)) unique.set(event.id, event);
    });

    return Array.from(unique.values());
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

  const liveEvents = getLiveEvents();

  return (
    <>
      <Head>
        <title>MotorXLive | Live Motorsports</title>
        <meta
          name="description"
          content="Watch live motorsports events, grassroots racing streams, and event replays."
        />
      </Head>

      <div style={styles.page}>
        <header style={styles.header}>
          <div style={styles.headerInner}>
            <Link href="/" style={styles.logoLink}>
              <img src={LOGO_SRC} alt="MotorXLive" style={styles.logoImage} />
            </Link>

            <nav style={styles.nav}>
              <Link href="/" style={styles.navButton}>
                Events
              </Link>
              <Link href="/contributor/login" style={styles.navButton}>
                Streamers
              </Link>              
            </nav>
          </div>
        </header>

        <div style={styles.heroBackdrop}>
          <div style={styles.container}>
            <section style={styles.hero}>
              <div style={styles.heroContent}>
                <p style={styles.eyebrow}>LIVE MOTORSPORTS NETWORK</p>
                <h1 style={styles.heroTitle}>Watch grassroots motorsports live.</h1>
                <p style={styles.heroSubtitle}>
                  Find nearby races, live feeds, and event replays from tracks,
                  streamers, and motorsports creators.
                </p>

                <div style={styles.heroActions}>
                  <a href="#search-events" style={styles.button}>
                    Find Events
                  </a>
                  <Link href="/contributor/login" style={styles.button}>
                    Add Your Stream
                  </Link>
                </div>
              </div>

              <div style={styles.heroLogoCard}>
                <img src={LOGO_SRC} alt="MotorXLive" style={styles.heroLogo} />

                <div style={styles.heroHeadlineWrap}>
                  <h1 style={styles.heroHeadline}>
                    Watch Live Motorsports — Anytime, Anywhere
                  </h1>

                  <p style={styles.heroHeadlineSubtext}>
                    Drag racing, off-road, grassroots events — all in one place.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <main style={styles.container}>
          {liveEvents.length > 0 ? (
            <section style={styles.liveNowSection}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>LIVE NOW</h2>
              </div>

              <div style={styles.liveNowScroller}>
                {liveEvents.map((event) => (
                  <div key={event.id} style={styles.liveNowCard}>
                    <div style={styles.liveBadgeLarge}>LIVE</div>
                    <Link href={`/events/${event.slug}/live`} style={{ textDecoration: "none" }}>
                      <EventCard event={event} />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

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
                  <Link key={category.id} href={`/categories/${category.slug}`} style={styles.categoryCard}>
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
              <Link href="/contributor/login" style={styles.contributorCard}>
                <div style={styles.contributorTitle}>Contributor Login</div>
                <div style={styles.contributorText}>
                  Log in to add or manage live streams and event videos.
                </div>
              </Link>

              <Link href="/contributor/streams" style={styles.contributorCard}>
                <div style={styles.contributorTitle}>Add Live Stream</div>
                <div style={styles.contributorText}>
                  Attach livestream sources to events and manage playback details.
                </div>
              </Link>

              <Link href="/contributor/videos" style={styles.contributorCard}>
                <div style={styles.contributorTitle}>Add Video</div>
                <div style={styles.contributorText}>
                  Publish completed videos and on-demand event content.
                </div>
              </Link>

              <Link href="/contributor/request-access" style={styles.contributorCard}>
                <div style={styles.contributorTitle}>Request Contributor Access</div>
                <div style={styles.contributorText}>
                  Streamers, media creators, tracks, and promoters can request verified access.
                </div>
              </Link>
            </div>
          </section>

          <section id="search-events" style={styles.searchPanel}>
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

                {suggesting ? <div style={styles.suggestLoading}>Loading suggestions...</div> : null}

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

                <button type="button" style={styles.secondaryButton} onClick={handleReset}>
                  Reset
                </button>
              </div>
            </form>

            <p style={styles.locationStatus}>{locationStatus}</p>

            {resolvedLocationLabel ? <p style={styles.locationHint}>{resolvedLocationLabel}</p> : null}

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
                {sortEventsLiveFirst(nearbyEventsData.items).map((event) => (
                  <div key={event.id}>
                    <div style={styles.eventCardWrap}>
                      {hasLiveStream(event) && (
                        <>
                          <div style={styles.liveBadge}>LIVE</div>
                          <Link href={`/events/${event.slug}/live`} style={styles.watchLiveOverlay}>
                            ▶ WATCH LIVE
                          </Link>
                        </>
                      )}
                      <EventCard event={event} />
                    </div>

                    {event.distanceMiles != null ? (
                      <p style={styles.distanceText}>{event.distanceMiles.toFixed(1)} miles away</p>
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
                {sortEventsLiveFirst(upcomingEventsData.items).map((event) => (
                  <div key={event.id} style={styles.eventCardWrap}>
                    {hasLiveStream(event) && (
                      <>
                        <div style={styles.liveBadge}>LIVE</div>
                        <Link href={`/events/${event.slug}/live`} style={styles.watchLiveOverlay}>
                          ▶ WATCH LIVE
                        </Link>
                      </>
                    )}
                    <EventCard event={event} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: BRAND?.colors?.bg || "#0B0F14",
    color: BRAND?.colors?.text || "#f5f7fa",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "rgba(5, 8, 13, 0.92)",
    backdropFilter: "blur(14px)",
    borderBottom: "1px solid rgba(0,229,255,0.18)",
  },
  headerInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "10px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
  },
  logoLink: {
    display: "inline-flex",
    alignItems: "center",
    textDecoration: "none",
  },
  logoImage: {
    height: 58,
    width: "auto",
    display: "block",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },
  navLink: {
    color: "#c9d1d9",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 700,
  },
  navButton: {
    color: "#020617",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 900,
    background: "linear-gradient(135deg, #00E5FF, #00FF9D)",
    padding: "9px 12px",
    borderRadius: 999,
  },
  heroBackdrop: {
    background:
      "radial-gradient(circle at 75% 20%, rgba(0,229,255,0.18), transparent 34%), radial-gradient(circle at 80% 58%, rgba(0,255,157,0.12), transparent 30%), linear-gradient(180deg, #05080d 0%, #0B0F14 100%)",
    borderBottom: "1px solid rgba(0,229,255,0.12)",
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "32px 20px 60px",
  },
  hero: {
    minHeight: 420,
    display: "grid",
    gridTemplateColumns: "1.05fr 0.95fr",
    alignItems: "center",
    gap: 28,
    padding: "28px 0 42px",
  },
  heroContent: {
    minWidth: 0,
  },
  heroLogoCard: {
    background: "rgba(17,22,28,0.52)",
    border: "1px solid rgba(0,229,255,0.18)",
    borderRadius: 22,
    padding: 18,
    boxShadow: "0 0 38px rgba(0,229,255,0.12)",
  },
  heroLogo: {
    width: "100%",
    display: "block",
    borderRadius: 16,
  },
  eyebrow: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 2,
    color: "#00E5FF",
    marginBottom: 12,
    fontWeight: 900,
  },
  heroTitle: {
    fontSize: 56,
    lineHeight: 0.96,
    margin: "0 0 16px",
    letterSpacing: -1.5,
  },
  heroSubtitle: {
    maxWidth: 720,
    fontSize: 18,
    lineHeight: 1.65,
    color: "#c9d1d9",
    margin: 0,
  },
  heroActions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 24,
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
    border: "1px solid rgba(0,229,255,0.15)",
    background: "#11161c",
    borderRadius: 14,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 800,
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
    border: "1px solid rgba(0,229,255,0.15)",
    background: "#11161c",
    borderRadius: 14,
    padding: 18,
    display: "grid",
    gap: 10,
  },
  contributorTitle: {
    fontSize: 18,
    fontWeight: 800,
  },
  contributorText: {
    fontSize: 14,
    color: "#c9d1d9",
    lineHeight: 1.5,
  },
  searchPanel: {
    background: "#11161c",
    border: "1px solid rgba(0,229,255,0.18)",
    borderRadius: 16,
    padding: 20,
    marginTop: 36,
    boxShadow: "0 0 22px rgba(0,229,255,0.08)",
  },
  searchForm: {
    display: "grid",
    gridTemplateColumns: "2fr 1.6fr 180px auto",
    gap: 12,
    alignItems: "start",
    marginTop: 16,
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
    fontWeight: 700,
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
    ...(brandStyles?.buttonPrimary || {}),
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    ...(brandStyles?.buttonSecondary || {}),
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
  liveNowSection: {
    marginTop: 36,
    background: "linear-gradient(135deg, rgba(255,0,51,0.18), rgba(0,229,255,0.08))",
    border: "1px solid rgba(255,0,51,0.45)",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 0 24px rgba(255,0,51,0.12)",
  },
  liveNowScroller: {
    display: "flex",
    gap: 16,
    overflowX: "auto",
    paddingBottom: 6,
  },
  liveNowCard: {
    position: "relative",
    minWidth: 320,
    maxWidth: 360,
    flex: "0 0 auto",
  },
  liveBadgeLarge: {
    position: "absolute",
    top: 10,
    left: 10,
    ...brandStyles.liveBadge,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    zIndex: 5,
  },
  eventGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 18,
  },
  eventCardWrap: {
    position: "relative",
  },
  liveBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    ...brandStyles.liveBadge,
    padding: "4px 8px",
    borderRadius: 6,
    fontSize: 12,
    zIndex: 5,
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
    color: "#00FF9D",
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
  watchLiveOverlay: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    background: "rgba(0,0,0,0.86)",
    color: "#fff",
    fontWeight: "900",
    textAlign: "center",
    padding: "10px",
    borderRadius: 8,
    textDecoration: "none",
    zIndex: 5,
    border: "1px solid #FF0033",
    boxShadow: "0 0 16px rgba(255,0,51,0.35)",
  },
    heroHeadlineWrap: {
    marginTop: 18,
    textAlign: "center",
  },

  heroHeadline: {
    fontSize: 28,
    lineHeight: 1.15,
    margin: "0 0 10px",
    fontWeight: 900,
    letterSpacing: -0.8,
  },

  heroHeadlineSubtext: {
    color: "#9AA4AF",
    margin: 0,
    fontSize: 15,
    lineHeight: 1.6,
  },
};