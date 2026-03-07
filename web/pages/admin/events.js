import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { adminFetch } from "../../lib/adminFetch";
import { uploadFlyer } from "../../lib/uploadFlyer";

export default function AdminEventsPage() {
  const [categories, setCategories] = useState([]);
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [flyerFile, setFlyerFile] = useState(null);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    startAt: "",
    endAt: "",
    heroImageUrl: "",
    categoryId: "",
  });

  async function loadAll() {
    try {
      setMessage("");

      const [categoriesRes, eventsRes] = await Promise.all([
        adminFetch("/api/admin/categories"),
        adminFetch("/api/admin/events"),
      ]);

      const categoriesText = await categoriesRes.text();
      const eventsText = await eventsRes.text();

      if (!categoriesRes.ok) {
        throw new Error(`Categories request failed: ${categoriesText}`);
      }

      if (!eventsRes.ok) {
        throw new Error(`Events request failed: ${eventsText}`);
      }

      const categoriesJson = categoriesText ? JSON.parse(categoriesText) : [];
      const eventsJson = eventsText ? JSON.parse(eventsText) : [];

      setCategories(Array.isArray(categoriesJson) ? categoriesJson : []);
      setEvents(Array.isArray(eventsJson) ? eventsJson : []);
    } catch (err) {
      setMessage(err.message || "Failed to load categories/events.");
      setCategories([]);
      setEvents([]);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleUploadFlyer() {
    try {
      if (!flyerFile) {
        setMessage("Choose a flyer image first.");
        return;
      }

      setUploading(true);
      setMessage("");

      const publicUrl = await uploadFlyer(flyerFile);

      setForm((s) => ({
        ...s,
        heroImageUrl: publicUrl,
      }));

      setMessage("Flyer uploaded successfully.");
    } catch (err) {
      setMessage(err.message || "Failed to upload flyer.");
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setMessage("");

    const res = await adminFetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        categoryId: form.categoryId || undefined,
        startAt: form.startAt || undefined,
        endAt: form.endAt || undefined,
        heroImageUrl: form.heroImageUrl || undefined,
      }),
    });

    const text = await res.text();

    if (!res.ok) {
      setMessage(`Failed to create event: ${text}`);
      return;
    }

    setMessage("Event created.");
    setForm({
      title: "",
      slug: "",
      description: "",
      startAt: "",
      endAt: "",
      heroImageUrl: "",
      categoryId: "",
    });
    setFlyerFile(null);
    loadAll();
  }

  async function updateEvent(id, patch) {
    const res = await adminFetch(`/api/admin/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    const text = await res.text();

    if (!res.ok) {
      setMessage(`Failed to update event: ${text}`);
      return;
    }

    setMessage("Event updated.");
    loadAll();
  }

  return (
    <AdminLayout title="Events">
      <div style={styles.grid}>
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Create Event</h2>

          <form onSubmit={handleCreate} style={styles.form}>
            <input style={styles.input} placeholder="Title" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
            <input style={styles.input} placeholder="Slug" value={form.slug} onChange={(e) => setForm((s) => ({ ...s, slug: e.target.value }))} />
            <textarea style={styles.textarea} placeholder="Description" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
            <input style={styles.input} type="datetime-local" value={form.startAt} onChange={(e) => setForm((s) => ({ ...s, startAt: e.target.value }))} />
            <input style={styles.input} type="datetime-local" value={form.endAt} onChange={(e) => setForm((s) => ({ ...s, endAt: e.target.value }))} />

            <select
              style={styles.input}
              value={form.categoryId}
              onChange={(e) => setForm((s) => ({ ...s, categoryId: e.target.value }))}
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <input
              style={styles.input}
              type="file"
              accept="image/*"
              onChange={(e) => setFlyerFile(e.target.files?.[0] || null)}
            />

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={handleUploadFlyer}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload Flyer"}
            </button>

            <input
              style={styles.input}
              placeholder="Flyer URL"
              value={form.heroImageUrl}
              onChange={(e) => setForm((s) => ({ ...s, heroImageUrl: e.target.value }))}
            />

            <button type="submit" style={styles.button}>Create Event</button>
          </form>

          {message ? <p style={styles.message}>{message}</p> : null}
        </section>

        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Existing Events</h2>

          <div style={styles.list}>
            {events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                categories={categories}
                onSave={updateEvent}
              />
            ))}

            {events.length === 0 ? (
              <p style={styles.mutedText}>No events yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function EventRow({ event, categories, onSave }) {
  const [draft, setDraft] = useState({
    title: event.title || "",
    slug: event.slug || "",
    description: event.description || "",
    heroImageUrl: event.heroImageUrl || "",
    categoryId: event.categoryId || "",
  });

  return (
    <div style={styles.rowCard}>
      <input style={styles.input} value={draft.title} onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))} />
      <input style={styles.input} value={draft.slug} onChange={(e) => setDraft((s) => ({ ...s, slug: e.target.value }))} />
      <input style={styles.input} value={draft.heroImageUrl} onChange={(e) => setDraft((s) => ({ ...s, heroImageUrl: e.target.value }))} placeholder="Flyer URL" />

      <select
        style={styles.input}
        value={draft.categoryId}
        onChange={(e) => setDraft((s) => ({ ...s, categoryId: e.target.value }))}
      >
        <option value="">Select category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      <button style={styles.secondaryButton} onClick={() => onSave(event.id, draft)}>
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
  list: {
    display: "grid",
    gap: 12,
  },
  rowCard: {
    display: "grid",
    gap: 10,
  },
  input: {
    width: "100%",
    background: "#0f141a",
    border: "1px solid #2a3647",
    color: "#f5f7fa",
    borderRadius: 10,
    padding: "12px 14px",
  },
  textarea: {
    width: "100%",
    minHeight: 90,
    background: "#0f141a",
    border: "1px solid #2a3647",
    color: "#f5f7fa",
    borderRadius: 10,
    padding: "12px 14px",
    resize: "vertical",
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
  message: {
    marginTop: 12,
    color: "#8fd19e",
    whiteSpace: "pre-wrap",
  },
  mutedText: {
    color: "#9aa4af",
  },
};