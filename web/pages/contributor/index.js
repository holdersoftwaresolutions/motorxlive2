import Link from "next/link";
import ContributorLayout from "../../components/ContributorLayout";
import { requireContributorPage } from "../../lib/requireContributorPage";

export default function ContributorHomePage({ currentUser }) {
  return (
    <ContributorLayout title="Dashboard">
      <p style={styles.subtitle}>
        Signed in as <strong>{currentUser?.email}</strong>. Submit livestreams and videos for the events you are covering.
      </p>

      <div style={styles.grid}>
        <Link href="/contributor/streams" style={styles.card}>
          <h2 style={styles.cardTitle}>Submit Streams</h2>
          <p style={styles.cardText}>
            Add livestream feeds for events and manage your submitted stream items.
          </p>
        </Link>

        <Link href="/contributor/videos" style={styles.card}>
          <h2 style={styles.cardTitle}>Submit Videos</h2>
          <p style={styles.cardText}>
            Upload or link finished video coverage and event media for review.
          </p>
        </Link>
      </div>
    </ContributorLayout>
  );
}

export const getServerSideProps = requireContributorPage;

const styles = {
  subtitle: {
    margin: "0 0 24px",
    color: "#c9d1d9",
    lineHeight: 1.6,
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