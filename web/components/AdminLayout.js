import Link from "next/link";
import { useRouter } from "next/router";
import AdminNav from "./AdminNav";

export default function AdminLayout({ title, children }) {
  const router = useRouter();

  function handleLogout() {
    document.cookie = "motorxlive_admin_key=; path=/; max-age=0; samesite=lax";
    router.push("/admin/login");
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.topRow}>
          <div>
            <p style={styles.eyebrow}>MotorXLive Admin</p>
            <h1 style={styles.title}>{title}</h1>
          </div>

          <div style={styles.topActions}>
            <Link href="/" style={styles.backLink}>
              ← Back to site
            </Link>
            <button onClick={handleLogout} style={styles.logoutButton}>
              Logout
            </button>
          </div>
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
  topActions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
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
  logoutButton: {
    background: "#1b2a40",
    color: "#fff",
    border: "1px solid #31598b",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
  },
};