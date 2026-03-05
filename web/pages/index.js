import { useEffect, useState } from "react";

export default function Home() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch("/api/healthz")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ ok: false }));
  }, []);

  return (
    <div style={{ padding: 32, fontFamily: "system-ui" }}>
      <h1>MotorXLive</h1>
      <p>Vercel proxies <code>/api/*</code> to the Render API.</p>
      <p>API health:</p>
      <pre style={{ background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
        {JSON.stringify(health, null, 2)}
      </pre>
    </div>
  );
}
