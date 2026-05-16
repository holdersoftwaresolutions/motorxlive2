import { useEffect, useMemo, useRef, useState } from "react";
import ContributorLayout from "../../components/ContributorLayout";
import { adminFetch } from "../../lib/adminFetch";
import { uploadFlyer } from "../../lib/uploadFlyer";
import { requireContributorPage } from "../../lib/requireContributorPage";

function slugify(value = "") {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toStartOfDayIso(dateStr) {
  return dateStr ? new Date(`${dateStr}T00:00:00`).toISOString() : undefined;
}

function toEndOfDayIso(dateStr) {
  return dateStr ? new Date(`${dateStr}T23:59:59`).toISOString() : undefined;
}

function formatStatus(status) {
  if (status === "PUBLISHED") return "Published";
  if (status === "NEEDS_REVIEW") return "Needs Review";
  if (status === "ARCHIVED") return "Archived";
  if (status === "MERGED") return "Merged";
  return status || "Needs Review";
}

export default function ContributorEventsPage() {
  const [categories, setCategories] = useState([]);
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedFlyerName, setSelectedFlyerName] = useState("");
  const [flyerChosen, setFlyerChosen] = useState(false);
  const [flyerUploaded, setFlyerUploaded] = useState(false);

  const flyerInputRef = useRef(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    heroImageUrl: "",
    categoryId: "",
    venueName: "",
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
    country: "USA",
  });

  const derivedSlug = useMemo(() => slugify(form.title), [form.title]);

  const createDisabled =
    creating ||
    uploading ||
    !form.title.trim() ||
    !form.startDate ||
    (flyerChosen && !flyerUploaded);

  async function loadAll() {
    try {
      setMessage("");
      setMessageType("success");

      const [categoriesRes, eventsRes] = await Promise.all([
        fetch("/api/public/categories"),
        adminFetch("/api/contributor/events"),
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
      setMessage(err.message || "Failed to load contributor events.");
      setMessageType("error");
      setCategories([]);
      setEvents([]);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function resetForm() {
    setForm({
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      heroImageUrl: "",
      categoryId: "",
      venueName: "",
      addressLine1: "",
      city: "",
      state: "",
      postalCode: "",
      country: "USA",
    });

    setSelectedFlyerName("");
    setFlyerChosen(false);
    setFlyerUploaded(false);

    if (flyerInputRef.current) {
      flyerInputRef.current.value = "";
    }
  }

  async function handleFlyerSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFlyerName(file.name);
    setFlyerChosen(true);
    setFlyerUploaded(false);
    setMessage("");
    setMessageType("success");

    try {
      setUploading(true);
      const publicUrl = await uploadFlyer(file);

      setForm((s) => ({
        ...s,
        heroImageUrl: publicUrl,
      }));

      setFlyerUploaded(true);
      setMessage("Flyer uploaded successfully.");
      setMessageType("success");
    } catch (err) {
      setFlyerUploaded(false);
      setForm((s) => ({
        ...s,
        heroImageUrl: "",
      }));
      setMessage(err.message || "Failed to upload flyer.");
      setMessageType("error");
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setMessage("");

    if (uploading) {
      setMessage("Please wait for the flyer upload to finish.");
      setMessageType("error");
      return;
    }

    if (flyerChosen && !flyerUploaded) {
      setMessage("Please upload the flyer successfully before submitting the event.");
      setMessageType("error");
      return;
    }

    try {
      setCreating(true);

      const payload = {
        title: form.title.trim(),
        slug: derivedSlug,
        description: form.description?.trim() || undefined,
        startAt: toStartOfDayIso(form.startDate),
        endAt: toEndOfDayIso(form.endDate || form.startDate),
        heroImageUrl: form.heroImageUrl || undefined,
        categoryId: form.categoryId || undefined,
        venueName: form.venueName?.trim() || undefined,
        addressLine1: form.addressLine1?.trim() || undefined,
        city: form.city?.trim() || undefined,
        state: form.state?.trim() || undefined,
        postalCode: form.postalCode?.trim() || undefined,
        country: form.country?.trim() || undefined,
      };

      const res = await adminFetch("/api/contributor/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok || json?.ok === false) {
        setMessage(json?.error || `Failed to submit event: ${text}`);
        setMessageType("error");
        return;
      }

      setMessage("Event submitted for admin review.");
      setMessageType("success");
      resetForm();
      loadAll();
    } finally {
      setCreating(false);
    }
  }

  return (
    <ContributorLayout title="Contributor Events">
      <div style={styles.grid}>
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Submit Event for Review</h2>
          <p style={styles.helperText}>
            Contributor-created events are reviewed by MotorXLive before they appear publicly.
          </p>

          <form onSubmit={handleCreate} style={styles.form}>
            <input
              style={styles.input}
              placeholder="Event Title"
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            />

            <div style={styles.helperText}>
              Slug will be created automatically: <strong>{derivedSlug || "—"}</strong>
            </div>

            <textarea
              style={styles.textarea}
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            />

            <input
              style={styles.input}
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))}
            />

            <input
              style={styles.input}
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((s) => ({ ...s, endDate: e.target.value }))}
            />

            <input
              style={styles.input}
              placeholder="Venue Name"
              value={form.venueName}
              onChange={(e) => setForm((s) => ({ ...s, venueName: e.target.value }))}
            />

            <input
              style={styles.input}
              placeholder="Address"
              value={form.addressLine1}
              onChange={(e) => setForm((s) => ({ ...s, addressLine1: e.target.value }))}
            />

            <input
              style={styles.input}
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))}
            />

            <input
              style={styles.input}
              placeholder="State"
              value={form.state}
              onChange={(e) => setForm((s) => ({ ...s, state: e.target.value }))}
            />

            <input
              style={styles.input}
              placeholder="Postal Code"
              value={form.postalCode}
              onChange={(e) => setForm((s) => ({ ...s, postalCode: e.target.value }))}
            />

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

            <div style={styles.flyerSection}>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => flyerInputRef.current?.click()}
                disabled={uploading || creating}
              >
                {uploading
                  ? "Uploading Flyer..."
                  : flyerUploaded
                  ? "Replace Flyer"
                  : "Choose Flyer"}
              </button>

              <input
                ref={flyerInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFlyerSelected}
              />

              <div style={styles.flyerStatus}>
                {!flyerChosen && !uploading ? (
                  <span style={styles.mutedText}>No flyer selected yet.</span>
                ) : null}

                {flyerChosen && selectedFlyerName ? (
                  <div style={styles.helperText}>
                    Selected: <strong>{selectedFlyerName}</strong>
                  </div>
                ) : null}

                {uploading ? <div style={styles.helperText}>Uploading flyer...</div> : null}

                {flyerUploaded && !uploading ? (
                  <div style={styles.successText}>Flyer ready.</div>
                ) : null}
              </div>

              {form.heroImageUrl ? (
                <div style={styles.previewCard}>
                  <img
                    src={form.heroImageUrl}
                    alt="Flyer preview"
                    style={styles.previewImage}
                  />
                </div>
              ) : null}
            </div>

            <button
              type="submit"
              style={{
                ...styles.button,
                ...(createDisabled ? styles.buttonDisabled : {}),
              }}
              disabled={createDisabled}
            >
              {uploading
                ? "Waiting for Flyer Upload..."
                : creating
                ? "Submitting Event..."
                : "Submit Event for Review"}
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
        </section>

        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>My Submitted Events</h2>

          <div style={styles.list}>
            {events.map((event) => (
              <div key={event.id} style={styles.rowCard}>
                <div>
                  <div style={styles.eventTitle}>{event.title}</div>
                  <div style={styles.mutedText}>
                    {event.venueName || "No venue"} • {event.city || "No city"}{" "}
                    {event.state || ""}
                  </div>
                </div>

                <div style={styles.statusPill}>
                  {formatStatus(event.eventReviewStatus)}
                </div>
              </div>
            ))}

            {events.length === 0 ? (
              <p style={styles.mutedText}>No submitted events yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </ContributorLayout>
  );
}

export const getServerSideProps = requireContributorPage;

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1.1fr",
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
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    border: "1px solid #243041",
    borderRadius: 12,
    padding: 12,
    background: "#0f141a",
    flexWrap: "wrap",
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
  helperText: {
    fontSize: 13,
    color: "#9aa4af",
    lineHeight: 1.5,
  },
  flyerSection: {
    display: "grid",
    gap: 10,
  },
  flyerStatus: {
    display: "grid",
    gap: 4,
  },
  previewCard: {
    background: "#0f141a",
    border: "1px solid #2a3647",
    borderRadius: 12,
    overflow: "hidden",
  },
  previewImage: {
    display: "block",
    width: "100%",
    maxHeight: 240,
    objectFit: "cover",
  },
  successText: {
    color: "#8fd19e",
    fontSize: 13,
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
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  message: {
    marginTop: 12,
    color: "#8fd19e",
  },
  errorMessage: {
    color: "#ffb4b4",
  },
  mutedText: {
    color: "#9aa4af",
    fontSize: 14,
  },
  eventTitle: {
    fontWeight: 800,
    marginBottom: 4,
  },
  statusPill: {
    color: "#dbe5f0",
    background: "#1b2a40",
    border: "1px solid #31598b",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 800,
  },
};