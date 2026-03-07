import Link from "next/link";
import AdminLayout from "../../components/AdminLayout";

const cards = [
  {
    href: "/admin/categories",
    title: "Categories",
    description: "Create and manage event types.",
  },
  {
    href: "/admin/events",
    title: "Events",
    description: "Create events, assign categories, add flyer URLs.",
  },
  {
    href: "/admin/streams",
    title: "Streams",
    description: "Attach live feeds to events and manage playback URLs.",
  },
  {
    href: "/admin/videos",
    title: "Videos",
    description: "Attach video content to events and publish completed content.",
  },
];

export default function AdminHomePage() {
  return (
    <AdminLayout title="Dashboard">
      <div style={styles.grid}>
        {cards.map((card) => (
          <Link key={card.href} href={card.href} style={styles.card}>
            <h2 style={styles.cardTitle}>{card.title}</h2>
            <p style={styles.cardDescription}>{card.description}</p>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
  },
  card: {
    display: "block",
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
  cardDescription: {
    margin: 0,
    color: "#c9d1d9",
    lineHeight: 1.5,
  },
};