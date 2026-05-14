import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { adminFetch } from "../../lib/adminFetch";
import { requireAdminPage } from "../../lib/requireAdminPage";
import { BRAND, brandStyles } from "../../lib/brand";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [busyUserId, setBusyUserId] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "STREAMER",
  });

  async function loadUsers() {
    const res = await adminFetch("/api/admin/users");
    const text = await res.text();

    if (!res.ok) {
      setMessage(text || "Failed to load users.");
      setUsers([]);
      return;
    }

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
      setMessage(json?.error || json?.message || "Failed to create contributor account.");
      return;
    }

    setForm({ name: "", email: "", password: "", role: "STREAMER" });
    setMessage("Contributor account created.");
    loadUsers();
  }

  async function handleResetPassword(user) {
    if (!user?.id) return;

    const confirmed = window.confirm(
      `Generate a new temporary password for ${user.email}?`
    );

    if (!confirmed) return;

    setBusyUserId(user.id);
    setMessage("");

    try {
      const res = await adminFetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok || !json?.temporaryPassword) {
        throw new Error(json?.message || json?.error || text || "Failed to reset password.");
      }

      setMessage(
        `Temporary password for ${json.user?.email}: ${json.temporaryPassword}`
      );

      alert(
        `Temporary password for ${json.user?.email}:\n\n${json.temporaryPassword}`
      );
    } catch (err) {
      setMessage(err.message || "Password reset failed.");
    } finally {
      setBusyUserId("");
    }
  }

  return (
    <AdminLayout title="Users">
      <div style={styles.grid}>
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Create Contributor Account</h2>

          <form onSubmit={handleCreate} style={styles.form}>
            <input
              style={styles.input}
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            />

            <input
              style={styles.input}
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            />

            <input
              style={styles.input}
              type="password"
              placeholder="Temporary Password"
              value={form.password}
              onChange={(e) =>
                setForm((s) => ({ ...s, password: e.target.value }))
              }
            />

            <select
              style={styles.input}
              value={form.role}
              onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))}
            >
              <option value="STREAMER">STREAMER</option>
              <option value="MEDIA">MEDIA</option>
            </select>

            <button type="submit" style={styles.button}>
              Create Account
            </button>
          </form>

          {message ? <p style={styles.message}>{message}</p> : null}
        </section>

        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Existing Users</h2>

          <div style={styles.list}>
            {users.map((user) => (
              <div key={user.id} style={styles.row}>
                <div style={styles.userInfo}>
                  <div style={styles.name}>{user.name || "Unnamed User"}</div>
                  <div style={styles.meta}>{user.email}</div>
                </div>

                <div style={styles.rowActions}>
                  <div style={styles.role}>{user.role}</div>

                  <button
                    type="button"
                    style={{
                      ...styles.resetPasswordButton,
                      ...(busyUserId === user.id ? styles.buttonDisabled : {}),
                    }}
                    disabled={busyUserId === user.id}
                    onClick={() => handleResetPassword(user)}
                  >
                    {busyUserId === user.id
                      ? "Resetting..."
                      : "Reset Temp Password"}
                  </button>
                </div>
              </div>
            ))}

            {users.length === 0 ? (
              <p style={styles.meta}>No users found.</p>
            ) : null}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export const getServerSideProps = requireAdminPage;

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1.1fr",
    gap: 20,
  },
  panel: {
    background: BRAND.colors.surface,
    border: "1px solid rgba(0, 229, 255, 0.14)",
    borderRadius: BRAND.radius.lg,
    padding: 18,
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 14,
  },
  form: {
    display: "grid",
    gap: 12,
  },
  list: {
    display: "grid",
    gap: 12,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    padding: "12px 14px",
    border: `1px solid ${BRAND.colors.border}`,
    borderRadius: BRAND.radius.md,
    background: BRAND.colors.surface2,
    flexWrap: "wrap",
  },
  userInfo: {
    minWidth: 220,
  },
  rowActions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  input: {
    ...brandStyles.input,
    width: "100%",
  },
  button: {
    ...brandStyles.buttonPrimary,
  },
  resetPasswordButton: {
    background: "#1b2a40",
    color: "#fff",
    border: "1px solid #31598b",
    borderRadius: BRAND.radius.md,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 800,
  },
  buttonDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },
  message: {
    marginTop: 12,
    color: BRAND.colors.green,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  },
  name: {
    fontWeight: 800,
  },
  meta: {
    color: BRAND.colors.muted,
    fontSize: 14,
  },
  role: {
    color: "#dbe5f0",
    background: "#1b2a40",
    border: "1px solid #31598b",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 800,
  },
};