import Link from "next/link";
import AdminNav from "./AdminNav";

export default function AdminLayout({ title, children }) {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.topRow}>
          <div>
            <p style={styles.eyebrow}>MotorXLive Admin</p>
            <h1 style={styles.title}>{title}</h1>
          </div>

          <Link href="/" style={styles.backLink}>
            ← Back to site
          </Link>
        </div>

        <AdminNav />

        <div>{children}</div>
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
    maxWidth: 1200,
    margin: "0 auto",
    padding: "32px 20px 60px",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#8fb3ff",
    margin: "0 0 6px",
  },
  title: {
    margin: 0,
    fontSize: 34,
  },
  backLink: {
    color: "#8fb3ff",
    textDecoration: "none",
    fontSize: 14,
    marginTop: 8,
  },
};