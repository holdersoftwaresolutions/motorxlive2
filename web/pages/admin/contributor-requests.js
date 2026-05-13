import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { adminFetch } from "../../lib/adminFetch";
import { requireAdminPage } from "../../lib/requireAdminPage";
import { BRAND, brandStyles } from "../../lib/brand";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
}

export default function AdminContributorRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("PENDING");
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

  async function loadRequests(nextStatus = status) {
    if (!options.preserveMessage) {
        setMessage("");
    }

    const params = new URLSearchParams();
    if (nextStatus) params.set("status", nextStatus);

    const res = await adminFetch(`/api/admin/contributor-access-requests?${params.toString()}`);
    const text = await res.text();

    const [requestsRes, countsRes] = await Promise.all([
        adminFetch(`/api/admin/contributor-access-requests?${params.toString()}`),
        adminFetch("/api/admin/contributor-access-requests/counts"),
    ]);

    const requestsText = await requestsRes.text();
    const countsText = await countsRes.text();

    if (!requestsRes.ok) {
        setMessage(requestsText || "Failed to load contributor requests.");
        setRequests([]);
        return;
    }

    const requestsJson = requestsText ? JSON.parse(requestsText) : [];
    const countsJson = countsText ? JSON.parse(countsText) : {};

    setRequests(Array.isArray(requestsJson) ? requestsJson : []);
    setCounts(countsJson || {});

    if (!res.ok) {
      setMessage(text || "Failed to load contributor requests.");
      setRequests([]);
      return;
    }

    const json = text ? JSON.parse(text) : [];
    setRequests(Array.isArray(json) ? json : []);
  }

  useEffect(() => {
    loadRequests(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function reviewRequest(id, action) {
    setBusyId(id);
    setMessage("");

    try {
        const res = await adminFetch(
        `/api/admin/contributor-access-requests/${id}/${action}`,
        {
            method: "PATCH",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({
            adminNotes: notes[id] || "",
            }),
        }
        );

        const text = await res.text();
        const json = text ? JSON.parse(text) : null;

        if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || json?.message || text || "Review failed.");
        }

        if (action === "approve" && json?.temporaryPassword) {
        setMessage(
            `Request approved. User created for ${json.user?.email}. Temporary password: ${json.temporaryPassword}`
        );
        } else if (action === "approve" && json?.userAlreadyExists) {
        setMessage(
            `Request approved. User already exists for ${json.user?.email}. No new password was generated.`
        );
        } else if (action === "approve") {
            setMessage(json?.message || "Request approved.");
        } else {
            setMessage("Request rejected.");
    }

    await loadRequests(status, { preserveMessage: true });
    } catch (err) {
        setMessage(err.message || "Review failed.");
        } finally {
        setBusyId("");
        }
    }

  return (
    <AdminLayout title="Contributor Requests">
      <section style={styles.panel}>
        <div style={styles.headerRow}>
          <div>
            <h2 style={styles.sectionTitle}>Contributor Access Requests</h2>
            <p style={styles.mutedText}>
              Review streamers, media creators, tracks, and promoters requesting access.
              Approval does not create an account yet.
            </p>
          </div>

          <select
            style={styles.filter}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="">All</option>
          </select>
        </div>

        {message ? <p style={styles.message}>{message}</p> : null}
      </section>
        
      <div style={styles.countGrid}>
        <button style={styles.countCard} onClick={() => setStatus("PENDING")}>
            <span style={styles.countNumber}>{counts.pending || 0}</span>
            <span style={styles.countLabel}>Pending</span>
        </button>

        <button style={styles.countCard} onClick={() => setStatus("APPROVED")}>
            <span style={styles.countNumber}>{counts.approved || 0}</span>
            <span style={styles.countLabel}>Approved</span>
        </button>

        <button style={styles.countCard} onClick={() => setStatus("REJECTED")}>
            <span style={styles.countNumber}>{counts.rejected || 0}</span>
            <span style={styles.countLabel}>Rejected</span>
        </button>

        <button style={styles.countCard} onClick={() => setStatus("")}>
            <span style={styles.countNumber}>{counts.total || 0}</span>
            <span style={styles.countLabel}>Total</span>
        </button>
    </div> 

      <section style={styles.list}>
        {requests.length === 0 ? (
          <div style={styles.panel}>
            <p style={styles.mutedText}>No contributor requests found.</p>
          </div>
        ) : (
          requests.map((request) => (
            <div key={request.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.requestTitle}>{request.name}</h3>
                  <p style={styles.meta}>
                    {request.email} {request.phone ? `• ${request.phone}` : ""}
                  </p>
                  <p style={styles.meta}>
                    {request.roleRequested} • {request.status} • {formatDate(request.createdAt)}
                  </p>
                </div>

                <span style={styles.statusPill}>{request.status}</span>
              </div>

              <div style={styles.detailGrid}>
                <div>
                  <div style={styles.label}>Organization</div>
                  <div style={styles.value}>{request.organizationName || "—"}</div>
                </div>
                <div>
                  <div style={styles.label}>Website / Social</div>
                  <div style={styles.value}>{request.websiteOrSocialUrl || "—"}</div>
                </div>
                <div>
                  <div style={styles.label}>YouTube</div>
                  <div style={styles.value}>{request.youtubeChannelUrl || "—"}</div>
                </div>
              </div>

              {request.reason ? (
                <div style={styles.reasonBox}>
                  <div style={styles.label}>Reason</div>
                  <p style={styles.reason}>{request.reason}</p>
                </div>
              ) : null}

              {request.status === "PENDING" ? (
                <div style={styles.reviewBox}>
                  <textarea
                    style={styles.textarea}
                    placeholder="Admin notes optional"
                    value={notes[request.id] || ""}
                    onChange={(e) =>
                      setNotes((prev) => ({
                        ...prev,
                        [request.id]: e.target.value,
                      }))
                    }
                  />

                  <div style={styles.actions}>
                    <button
                      type="button"
                      style={styles.approveButton}
                      disabled={busyId === request.id}
                      onClick={() => reviewRequest(request.id, "approve")}
                    >
                      Approve
                    </button>

                    <button
                      type="button"
                      style={styles.rejectButton}
                      disabled={busyId === request.id}
                      onClick={() => reviewRequest(request.id, "reject")}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : request.adminNotes ? (
                <div style={styles.reasonBox}>
                  <div style={styles.label}>Admin Notes</div>
                  <p style={styles.reason}>{request.adminNotes}</p>
                </div>
              ) : null}
            </div>
          ))
        )}
      </section>
    </AdminLayout>
  );
}

export const getServerSideProps = requireAdminPage;

const styles = {
  panel: {
    background: BRAND.colors.surface,
    border: "1px solid rgba(0, 229, 255, 0.14)",
    borderRadius: BRAND.radius.lg,
    padding: 18,
    marginBottom: 18,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  sectionTitle: {
    margin: "0 0 8px",
  },
  mutedText: {
    color: BRAND.colors.muted,
    lineHeight: 1.5,
    margin: 0,
  },
  filter: {
    ...brandStyles.input,
    minWidth: 180,
  },
  list: {
    display: "grid",
    gap: 16,
  },
  card: {
    background: BRAND.colors.surface,
    border: "1px solid rgba(0, 229, 255, 0.14)",
    borderRadius: BRAND.radius.lg,
    padding: 18,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  requestTitle: {
    margin: "0 0 6px",
    fontSize: 22,
  },
  meta: {
    margin: "4px 0",
    color: BRAND.colors.muted,
    fontSize: 14,
  },
  statusPill: {
    alignSelf: "flex-start",
    background: "rgba(0, 229, 255, 0.12)",
    color: BRAND.colors.blue,
    border: "1px solid rgba(0, 229, 255, 0.28)",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 900,
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    marginTop: 16,
  },
  label: {
    fontSize: 12,
    color: BRAND.colors.blue,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: 900,
    marginBottom: 5,
  },
  value: {
    color: BRAND.colors.text,
    overflowWrap: "anywhere",
  },
  reasonBox: {
    marginTop: 16,
    background: BRAND.colors.surface2,
    border: `1px solid ${BRAND.colors.border}`,
    borderRadius: BRAND.radius.md,
    padding: 12,
  },
  reason: {
    margin: 0,
    color: "#d3d8de",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },
  reviewBox: {
    display: "grid",
    gap: 10,
    marginTop: 16,
  },
  textarea: {
    ...brandStyles.input,
    minHeight: 90,
    resize: "vertical",
  },
  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  approveButton: {
    ...brandStyles.buttonPrimary,
  },
  rejectButton: {
    background: "#8f2d2d",
    color: "#fff",
    border: 0,
    borderRadius: BRAND.radius.md,
    padding: "12px 14px",
    cursor: "pointer",
    fontWeight: 800,
  },
  message: {
    color: BRAND.colors.green,
    marginTop: 12,
  },
  countGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 12,
  marginBottom: 18,
},

countCard: {
  background: "rgba(0, 229, 255, 0.08)",
  border: "1px solid rgba(0, 229, 255, 0.18)",
  color: BRAND.colors.text,
  borderRadius: BRAND.radius.lg,
  padding: 14,
  cursor: "pointer",
  textAlign: "left",
},

countNumber: {
  display: "block",
  fontSize: 28,
  fontWeight: 900,
  color: BRAND.colors.green,
},

countLabel: {
  display: "block",
  marginTop: 4,
  color: BRAND.colors.muted,
  fontSize: 13,
  fontWeight: 800,
},
};