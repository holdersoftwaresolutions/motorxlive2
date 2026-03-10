import Link from "next/link";

export default function ContributorHomePage() {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <p style={styles.eyebrow}>MotorXLive</p>
        <h1 style={styles.title}>Contributor Dashboard</h1>
        <p style={styles.subtitle}>
          Submit and manage your live feeds and event videos.
        </p>

        <div style={styles.grid}>
          <Link href="/contributor/streams" style={styles.card}>
            <h2 style={styles.cardTitle}>Submit Streams</h2>
            <p style={styles.cardText}>
              Add livestreams for events you are covering.
            </p>
          </Link>

          <Link href="/contributor/videos" style={styles.card}>
            <h2 style={styles.cardTitle}>Submit Videos</h2>
            <p style={styles.cardText}>
              Add completed videos and event media.
            </p>
          </Link>
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
    maxWidth: 1000,
    margin: "0 auto",
    padding: "32px 20px 60px",
  },
  eyebrow: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#8fb3ff",
    margin: "0 0 8px",
  },
  title: {
    margin: "0 0 12px",
    fontSize: 36,
  },
  subtitle: {
    margin: "0 0 24px",
    color: "#c9d1d9",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
  },
  card: {
    textDecoration: "none",
    color: "#f5f7fa",
    border: "1px solid #1f2937",
    background: "#11161c",
    borderRadius: 14,
    padding: 20,
  },
  cardTitle: {
    margin: "0 0 8px",
    fontSize: 22,
  },
  cardText: {
    margin: 0,
    color: "#c9d1d9",
    lineHeight: 1.5,
  },
};