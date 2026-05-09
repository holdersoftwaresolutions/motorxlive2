import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import EventCard from "../../components/EventCard";

export default function CategoryPage({ slug }) {
  const [categories, setCategories] = useState([]);
  const [eventsData, setEventsData] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [categoriesRes, eventsRes] = await Promise.all([
          fetch("/api/public/categories"),
          fetch(`/api/public/events?categorySlug=${encodeURIComponent(slug)}&page=1&pageSize=24`),
        ]);

        const [categoriesJson, eventsJson] = await Promise.all([
          categoriesRes.json(),
          eventsRes.json(),
        ]);

        if (!mounted) return;

        setCategories(Array.isArray(categoriesJson) ? categoriesJson : []);
        setEventsData(eventsJson || { items: [] });
      } catch (err) {
        if (!mounted) return;
        setError("Failed to load category page.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [slug]);

  const currentCategory = useMemo(() => {
    return categories.find((c) => c.slug === slug) || null;
  }, [categories, slug]);

  return (
    <>
      <Head>
        <title>{currentCategory?.name || slug} | MotorXLive</title>
        <meta
          name="description"
          content={`Browse events in ${currentCategory?.name || slug}.`}
        />
      </Head>

      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.topBar}>
            <Link href="/" style={styles.backLink}>
              ← Back to Home
            </Link>
          </div>

          <section style={styles.hero}>
            <p style={styles.eyebrow}>Category</p>
            <h1 style={styles.heroTitle}>
              {currentCategory?.name || slug}
            </h1>
            <p style={styles.heroSubtitle}>
              Browse all events currently available in this category.
            </p>
          </section>

          <section style={styles.section}>
            {loading ? (
              <p style={styles.mutedText}>Loading events...</p>
            ) : error ? (
              <p style={styles.errorText}>{error}</p>
            ) : !eventsData?.items?.length ? (
              <p style={styles.mutedText}>No events available in this category yet.</p>
            ) : (
              <div style={styles.eventGrid}>
                {eventsData.items.map((event) => (
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

export async function getServerSideProps(context) {
  return {
    props: {
      slug: context.params.slug,
    },
  };
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
  topBar: {
    marginBottom: 20,
  },
  backLink: {
    color: "#8fb3ff",
    textDecoration: "none",
    fontSize: 14,
  },
  hero: {
    marginBottom: 28,
  },
  eyebrow: {
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#8fb3ff",
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 40,
    lineHeight: 1.1,
    margin: "0 0 12px",
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 1.6,
    color: "#c9d1d9",
    margin: 0,
  },
  section: {
    marginTop: 24,
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
};