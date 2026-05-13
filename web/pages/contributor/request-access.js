import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { BRAND, brandStyles } from "../../lib/brand";

const LOGO_SRC = "/branding/motorxlive-logo-bg.png";

export default function ContributorRequestAccessPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    organizationName: "",
    roleRequested: "STREAMER",
    websiteOrSocialUrl: "",
    youtubeChannelUrl: "",
    reason: "",
    companyWebsite: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    setMessageType("success");

    try {
      const res = await fetch("/api/public/contributor-access-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.message || json?.error || text || "Request failed.");
      }

      setMessage(
        "Request received. We’ll review it and follow up when contributor access is ready."
      );
      setMessageType("success");

      setForm({
        name: "",
        email: "",
        phone: "",
        organizationName: "",
        roleRequested: "STREAMER",
        websiteOrSocialUrl: "",
        youtubeChannelUrl: "",
        reason: "",
        companyWebsite: "",
      });
    } catch (err) {
      setMessage(err.message || "Failed to submit request.");
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Request Contributor Access | MotorXLive</title>
        <meta
          name="description"
          content="Request access to contribute livestreams, videos, and event content to MotorXLive."
        />
      </Head>

      <div style={styles.page}>
        <div style={styles.bgGlowOne} />
        <div style={styles.bgGlowTwo} />

        <main style={styles.container}>
          <section style={styles.card}>
            <Link href="/" style={styles.logoLink}>
              <img src={LOGO_SRC} alt="MotorXLive" style={styles.logo} />
            </Link>

            <p style={styles.eyebrow}>Contributor Access</p>
            <h1 style={styles.title}>Request access to add streams, videos, and event content.</h1>
            <p style={styles.subtitle}>
              MotorXLive verifies contributors before they can submit livestreams, videos,
              or event flyers. Tell us who you are and what type of content you want to add.
            </p>

            <form onSubmit={handleSubmit} style={styles.form}>
              <input
                style={styles.input}
                placeholder="Your name"
                value={form.name}
                required
                onChange={(e) => updateField("name", e.target.value)}
              />

              <input
                style={styles.input}
                type="email"
                placeholder="Email"
                value={form.email}
                required
                onChange={(e) => updateField("email", e.target.value)}
              />

              <input
                style={styles.input}
                placeholder="Phone optional"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />

              <input
                style={styles.input}
                placeholder="Organization, channel, track, or media name"
                value={form.organizationName}
                onChange={(e) => updateField("organizationName", e.target.value)}
              />

              <select
                style={styles.input}
                value={form.roleRequested}
                onChange={(e) => updateField("roleRequested", e.target.value)}
              >
                <option value="STREAMER">Streamer</option>
                <option value="MEDIA">Media / Creator</option>
                <option value="TRACK">Track</option>
                <option value="PROMOTER">Promoter</option>
                <option value="OTHER">Other</option>
              </select>

              <input
                style={styles.input}
                placeholder="Website or social profile URL"
                value={form.websiteOrSocialUrl}
                onChange={(e) => updateField("websiteOrSocialUrl", e.target.value)}
              />

              <input
                style={styles.input}
                placeholder="YouTube channel URL optional"
                value={form.youtubeChannelUrl}
                onChange={(e) => updateField("youtubeChannelUrl", e.target.value)}
              />

              <textarea
                style={styles.textarea}
                placeholder="Tell us what content you want to contribute and why."
                value={form.reason}
                onChange={(e) => updateField("reason", e.target.value)}
              />

              <input
                tabIndex="-1"
                autoComplete="off"
                style={styles.honeypot}
                value={form.companyWebsite}
                onChange={(e) => updateField("companyWebsite", e.target.value)}
              />

              <button
                type="submit"
                style={{
                  ...styles.button,
                  ...(submitting ? styles.buttonDisabled : {}),
                }}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Access Request"}
              </button>
            </form>

            {message ? (
              <p
                style={{
                  ...styles.message,
                  ...(messageType === "error" ? styles.errorMessage : {}),
                }}
              >
                {message}
              </p>
            ) : null}

            <div style={styles.footerLinks}>
              <Link href="/contributor/login" style={styles.backLink}>
                Already approved? Sign in
              </Link>
              <Link href="/" style={styles.backLink}>
                Back to MotorXLive
              </Link>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
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
  container: {
    position: "relative",
    zIndex: 2,
    maxWidth: 760,
    margin: "0 auto",
    padding: "40px 0 70px",
  },
  card: {
    background: "rgba(17, 22, 28, 0.94)",
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
    maxWidth: 300,
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
    fontSize: 34,
    lineHeight: 1.05,
    letterSpacing: -1,
  },
  subtitle: {
    margin: "0 0 22px",
    color: BRAND.colors.muted,
    lineHeight: 1.6,
  },
  form: {
    display: "grid",
    gap: 12,
  },
  input: {
    ...brandStyles.input,
    width: "100%",
  },
  textarea: {
    ...brandStyles.input,
    width: "100%",
    minHeight: 130,
    resize: "vertical",
  },
  honeypot: {
    position: "absolute",
    left: "-9999px",
    opacity: 0,
    height: 0,
    width: 0,
  },
  button: {
    ...brandStyles.buttonPrimary,
    width: "100%",
  },
  buttonDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },
  message: {
    marginTop: 14,
    color: BRAND.colors.green,
    lineHeight: 1.5,
  },
  errorMessage: {
    color: "#ff9b9b",
  },
  footerLinks: {
    display: "flex",
    justifyContent: "center",
    gap: 14,
    flexWrap: "wrap",
    marginTop: 18,
  },
  backLink: {
    color: BRAND.colors.blue,
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 700,
  },
};