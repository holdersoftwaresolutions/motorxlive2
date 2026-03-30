import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { adminFetch } from "../../lib/adminFetch";
import { requireAdminPage } from "../../lib/requireAdminPage";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "STREAMER",
  });

  async function loadUsers() {
    const res = await adminFetch("/api/admin/users");
    const text = await res.text();
    const json = text ? JSON.parse(text) : [];
    setUsers(Array.isArray(json) ? json : []);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setMessage("");

    const res = await adminFetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const text = await res.text();
    const json = text ? JSON.parse(text) : null;

    if (!res.ok || json?.ok === false) {
      setMessage(json?.error || "Failed to create contributor account.");
      return;
    }

    setForm({ name: "", email: "", password: "", role: "STREAMER" });
    setMessage("Contributor account created.");
    loadUsers();
  }

  return (
    <AdminLayout title="Users">
      <div style={styles.grid}>
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Create Contributor Account</h2>
          <form onSubmit={handleCreate} style={styles.form}>
            <input style={styles.input} placeholder="Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            <input style={styles.input} placeholder="Email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
            <input style={styles.input} type="password" placeholder="Temporary Password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
            <select style={styles.input} value={form.role} onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))}>
              <option value="STREAMER">STREAMER</option>
              <option value="MEDIA">MEDIA</option>
            </select>
            <button type="submit" style={styles.button}>Create Account</button>
          </form>
          {message ? <p style={styles.message}>{message}</p> : null}
        </section>

        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Existing Users</h2>
          <div style={styles.list}>
            {users.map((user) => (
              <div key={user.id} style={styles.row}>
                <div>
                  <div style={styles.name}>{user.name || "Unnamed User"}</div>
                  <div style={styles.meta}>{user.email}</div>
                </div>
                <div style={styles.role}>{user.role}</div>
              </div>
            ))}
            {users.length === 0 ? <p style={styles.meta}>No users found.</p> : null}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export const getServerSideProps = requireAdminPage;

const styles = {
  grid: { display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 20 },
  panel: { background: "#11161c", border: "1px solid #1f2937", borderRadius: 14, padding: 18 },
  sectionTitle: { marginTop: 0, marginBottom: 14 },
  form: { display: "grid", gap: 12 },
  list: { display: "grid", gap: 12 },
  row: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "12px 14px", border: "1px solid #243041", borderRadius: 12, background: "#0f141a" },
  input: { width: "100%", background: "#0f141a", border: "1px solid #2a3647", color: "#f5f7fa", borderRadius: 10, padding: "12px 14px" },
  button: { background: "#2563eb", color: "#fff", border: 0, borderRadius: 10, padding: "12px 14px", cursor: "pointer" },
  message: { marginTop: 12, color: "#8fd19e" },
  name: { fontWeight: 700 },
  meta: { color: "#9aa4af", fontSize: 14 },
  role: { color: "#dbe5f0", background: "#1b2a40", border: "1px solid #31598b", borderRadius: 999, padding: "6px 10px", fontSize: 12 },
};
