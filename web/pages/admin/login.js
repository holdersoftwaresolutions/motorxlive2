import { useState } from "react";
import { useRouter } from "next/router";

export default function AdminLoginPage() {
  const router = useRouter();
  const [keyValue, setKeyValue] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!keyValue.trim()) {
      setError("Enter the admin key.");
      return;
    }

    document.cookie = `motorxlive_admin_key=${encodeURIComponent(keyValue)}; path=/; max-age=86400; samesite=lax`;
    router.push("/admin");
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <p style={styles.eyebrow}>MotorXLive Admin</p>
        <h1 style={styles.title}>Admin Login</h1>
        <p style={styles.text}>
          Enter the admin key to access the admin UI.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            placeholder="Admin key"
            value={keyValue}
            onChange={(e) => setKeyValue(e.target.value)}
            style={styles.input}
          />

          <button type="submit" style={styles.button}>
            Enter Admin
          </button>
        </form>

        {error ? <p style={styles.error}>{error}</p> : null}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0b0d10",
    color: "#f5f7fa",
    fontFamily: "system-ui",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#11161c",
    border: "1px solid #1f2937",
    borderRadius: 16,
    padding: 24,
  },
  eyebrow: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#8fb3ff",
    margin: "0 0 8px",
  },
  title: {
    margin: "0 0 10px",
    fontSize: 32,
  },
  text: {
    margin: "0 0 18px",
    color: "#c9d1d9",
  },
  form: {
    display: "grid",
    gap: 12,
  },
  input: {
    width: "100%",
    background: "#0f141a",
    border: "1px solid #2a3647",
    color: "#f5f7fa",
    borderRadius: 10,
    padding: "12px 14px",
  },
  button: {
    background: "#2563eb",
    color: "#fff",
    border: 0,
    borderRadius: 10,
    padding: "12px 14px",
    cursor: "pointer",
  },
  error: {
    marginTop: 12,
    color: "#ff9b9b",
  },
};