import Link from "next/link";
import AdminLayout from "../../components/AdminLayout";
import { requireAdminPage } from "../../lib/requireAdminPage";

export default function AdminHomePage({ currentUser }) {
  const cards = [
    {
      href: "/admin/categories",
      title: "Categories",
      description: "Create and manage event types and categories.",
    },
    {
      href: "/admin/events",
      title: "Events",
      description: "Create events, assign categories, and upload event flyers.",
    },
    {
      href: "/admin/streams",
      title: "Streams",
      description: "Attach livestream sources to events and manage playback.",
    },
    {
      href: "/admin/videos",
      title: "Videos",
      description: "Attach completed videos to events and publish them.",
    },
    {
      href: "/admin/streams/review",
      title: "Stream Review",
      description: "Approve or reject streamer-submitted livestreams.",
    },
    {
      href: "/admin/videos/review",
      title: "Video Review",
      description: "Approve or reject contributor-submitted videos.",
    },
  ];

  return (
    <AdminLayout title="Admin Dashboard">
      <p style={{ marginTop: 0, color: "#c9d1d9" }}>
        Signed in as <strong>{currentUser?.email}</strong>.
      </p>

      <div style={styles.wrapper}>
        <div style={styles.grid}>
          {cards.map((card) => (
            <Link key={card.href} href={card.href} style={styles.card}>
              <h2 style={styles.cardTitle}>{card.title}</h2>
              <p style={styles.cardDescription}>{card.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

export const getServerSideProps = requireAdminPage;

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 18,
  },
  card: {
    display: "block",
    textDecoration: "none",
    color: "#f5f7fa",
    border: "1px solid #1f2937",
    background: "#11161c",
    borderRadius: 14,
    padding: 22,
  },
  cardTitle: {
    margin: "0 0 10px",
    fontSize: 22,
  },
  cardDescription: {
    margin: 0,
    fontSize: 15,
    color: "#c9d1d9",
    lineHeight: 1.5,
  },
};