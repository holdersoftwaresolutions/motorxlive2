import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { BRAND, brandStyles } from "../../lib/brand";

const LOGO_SRC = "/branding/motorxlive-logo-bg.png";

function getDestinationForRole(role) {
  const normalized = String(role || "").toUpperCase();

  if (normalized === "ADMIN") return "/admin";

  if (
    normalized === "STREAMER" ||
    normalized === "MEDIA" ||
    normalized === "CONTRIBUTOR"
  ) {
    return "/contributor";
  }

  return "/";
}

export default function ContributorLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || json?.error || "Login failed");
      }

      const role = json?.user?.role;

      router.push(getDestinationForRole(role));
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.bgGlowOne} />
      <div style={styles.bgGlowTwo} />

      <div style={styles.card}>
        <Link href="/" style={styles.logoLink}>
          <img
            src={LOGO_SRC}
            alt="MotorXLive Contributor Portal"
            style={styles.logo}
          />
        </Link>

        <p style={styles.eyebrow}>Contributor Portal</p>

        <h1 style={styles.title}>Creator / Streamer Login</h1>

        <p style={styles.subtitle}>
          Access your livestreams, upload videos, manage event coverage, and
          contribute content to MotorXLive.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {}),
            }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {error ? <p style={styles.error}>{error}</p> : null}

        <div style={styles.footerLinks}>
          <Link href="/" style={styles.backLink}>
            ← Back to MotorXLive
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: BRAND.colors.bg,
    color: BRAND.colors.text,
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    padding: 20,
  },

  bgGlowOne: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: "50%",
    background: "rgba(0, 229, 255, 0.16)",
    filter: "blur(80px)",
    top: -120,
    right: -120,
  },

  bgGlowTwo: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: "50%",
    background: "rgba(0, 255, 157, 0.12)",
    filter: "blur(80px)",
    bottom: -120,
    left: -120,
  },

  card: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    maxWidth: 460,
    background: "rgba(17, 22, 28, 0.92)",
    border: "1px solid rgba(0, 229, 255, 0.18)",
    borderRadius: BRAND.radius.xl,
    padding: 26,
    boxShadow: "0 0 36px rgba(0, 229, 255, 0.12)",
  },

  logoLink: {
    display: "flex",
    justifyContent: "center",
    textDecoration: "none",
    marginBottom: 18,
  },

  logo: {
    width: "100%",
    maxWidth: 280,
    height: "auto",
    display: "block",
  },

  eyebrow: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1.8,
    color: BRAND.colors.green,
    margin: "0 0 8px",
    fontWeight: 900,
  },

  title: {
    margin: "0 0 10px",
    fontSize: 30,
    letterSpacing: -0.8,
  },

  subtitle: {
    margin: "0 0 18px",
    color: BRAND.colors.muted,
    lineHeight: 1.55,
    fontSize: 14,
  },

  form: {
    display: "grid",
    gap: 12,
  },

  input: {
    ...brandStyles.input,
    width: "100%",
  },

  button: {
    ...brandStyles.buttonPrimary,
    width: "100%",
  },

  buttonDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },

  error: {
    marginTop: 12,
    color: "#ff9b9b",
  },

  footerLinks: {
    marginTop: 18,
    display: "flex",
    justifyContent: "center",
  },

  backLink: {
    color: BRAND.colors.green,
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 700,
  },
};