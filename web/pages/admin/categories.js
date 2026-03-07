import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { adminFetch } from "../../lib/adminFetch";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    sortOrder: 0,
  });
  const [message, setMessage] = useState("");

  async function loadCategories() {
    const res = await adminFetch("/api/admin/categories");
    const json = await res.json();
    setCategories(Array.isArray(json) ? json : []);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setMessage("");

    const res = await adminFetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug,
        sortOrder: Number(form.sortOrder || 0),
      }),
    });

    if (!res.ok) {
      setMessage("Failed to create category.");
      return;
    }

    setForm({ name: "", slug: "", sortOrder: 0 });
    setMessage("Category created.");
    loadCategories();
  }

  async function updateCategory(id, patch) {
    const res = await adminFetchetch(`/api/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      setMessage("Failed to update category.");
      return;
    }

    setMessage("Category updated.");
    loadCategories();
  }

  return (
    <AdminLayout title="Categories">
      <div style={styles.grid}>
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Create Category</h2>

          <form onSubmit={handleCreate} style={styles.form}>
            <input
              style={styles.input}
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            />

            <input
              style={styles.input}
              placeholder="Slug"
              value={form.slug}
              onChange={(e) => setForm((s) => ({ ...s, slug: e.target.value }))}
            />

            <input
              style={styles.input}
              type="number"
              placeholder="Sort Order"
              value={form.sortOrder}
              onChange={(e) => setForm((s) => ({ ...s, sortOrder: e.target.value }))}
            />

            <button type="submit" style={styles.button}>Create Category</button>
          </form>

          {message ? <p style={styles.message}>{message}</p> : null}
        </section>

        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Existing Categories</h2>

          <div style={styles.list}>
            {categories.map((category) => (
              <CategoryRow key={category.id} category={category} onSave={updateCategory} />
            ))}

            {categories.length === 0 ? (
              <p style={styles.mutedText}>No categories yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function CategoryRow({ category, onSave }) {
  const [draft, setDraft] = useState({
    name: category.name || "",
    slug: category.slug || "",
    sortOrder: category.sortOrder ?? 0,
  });

  return (
    <div style={styles.rowCard}>
      <input
        style={styles.input}
        value={draft.name}
        onChange={(e) => setDraft((s) => ({ ...s, name: e.target.value }))}
      />
      <input
        style={styles.input}
        value={draft.slug}
        onChange={(e) => setDraft((s) => ({ ...s, slug: e.target.value }))}
      />
      <input
        style={styles.input}
        type="number"
        value={draft.sortOrder}
        onChange={(e) => setDraft((s) => ({ ...s, sortOrder: Number(e.target.value) }))}
      />
      <button
        style={styles.secondaryButton}
        onClick={() => onSave(category.id, draft)}
      >
        Save
      </button>
    </div>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1.2fr",
    gap: 20,
  },
  panel: {
    background: "#11161c",
    border: "1px solid #1f2937",
    borderRadius: 14,
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
  secondaryButton: {
    background: "#1b2a40",
    color: "#fff",
    border: "1px solid #31598b",
    borderRadius: 10,
    padding: "12px 14px",
    cursor: "pointer",
  },
  list: {
    display: "grid",
    gap: 12,
  },
  rowCard: {
    display: "grid",
    gridTemplateColumns: "1.3fr 1fr 120px 100px",
    gap: 10,
    alignItems: "center",
  },
  message: {
    marginTop: 12,
    color: "#8fd19e",
  },
  mutedText: {
    color: "#9aa4af",
  },
};