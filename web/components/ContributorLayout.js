import Link from "next/link";
import { useRouter } from "next/router";
import ContributorNav from "./ContributorNav";

export default function ContributorLayout({ title, children }) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {}

    router.push("/contributor/login");
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.topRow}>
          <div>
            <p style={styles.eyebrow}>MotorXLive Contributor Portal</p>
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

        <ContributorNav />

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
    maxWidth: 1100,
    margin: "0 auto",
    padding: "32px 20px 60px",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  topActions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
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