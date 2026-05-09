import Link from "next/link";
import { useRouter } from "next/router";
import AdminNav from "./AdminNav";
import { BRAND, brandStyles } from "../lib/brand";

const LOGO_SRC = "/branding/motorxlive-logo-bg.png";

export default function AdminLayout({ title, children }) {
  const router = useRouter();

  function handleLogout() {
    document.cookie = "motorxlive_admin_key=; path=/; max-age=0; samesite=lax";
    document.cookie = "motorxlive_access_token=; path=/; max-age=0; samesite=lax";
    document.cookie = "motorxlive_refresh_token=; path=/; max-age=0; samesite=lax";
    router.push("/admin/login");
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <Link href="/admin" style={styles.logoLink}>
            <img src={LOGO_SRC} alt="MotorXLive Admin" style={styles.logoImage} />
          </Link>

          <div style={styles.topActions}>
            <Link href="/" style={styles.backLink}>
              ← Back to site
            </Link>
            <button onClick={handleLogout} style={styles.logoutButton}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={styles.container}>
        <div style={styles.titleBlock}>
          <p style={styles.eyebrow}>MotorXLive Admin</p>
          <h1 style={styles.title}>{title}</h1>
        </div>

        <AdminNav />

        <div style={styles.content}>{children}</div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: BRAND.colors.bg,
    color: BRAND.colors.text,
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "rgba(5, 8, 13, 0.94)",
    backdropFilter: "blur(14px)",
    borderBottom: `1px solid rgba(0, 229, 255, 0.18)`,
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
    height: 54,
    width: "auto",
    display: "block",
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "28px 20px 60px",
  },
  titleBlock: {
    marginBottom: 20,
    padding: 18,
    background:
      "linear-gradient(135deg, rgba(0,229,255,0.08), rgba(0,255,157,0.04))",
    border: `1px solid rgba(0, 229, 255, 0.14)`,
    borderRadius: BRAND.radius.xl,
  },
  topActions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  eyebrow: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1.6,
    color: BRAND.colors.blue,
    margin: "0 0 6px",
    fontWeight: 900,
  },
  title: {
    margin: 0,
    fontSize: 34,
    letterSpacing: -0.8,
  },
  backLink: {
    color: BRAND.colors.blue,
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 700,
  },
  logoutButton: {
    ...brandStyles.buttonSecondary,
    padding: "10px 14px",
  },
  content: {
    marginTop: 18,
  },
};