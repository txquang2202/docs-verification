"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";

type DocStatus =
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "REJECTED"
  | "INCONCLUSIVE"
  | "PENDING_REVIEW"
  | "APPROVED";

interface DocItem {
  id: string;
  status: DocStatus;
  fileName: string;
  fileSize: number;
  rejectionReason: string | null;
  version: number;
  uploadedAt: string;
  updatedAt: string;
  seller: { id: string; email: string };
}

interface AuditEvent {
  id: string;
  actorRole: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  metadata: any;
  createdAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING_VERIFICATION: "bg-amber-100 text-amber-800 ring-amber-200",
  VERIFIED: "bg-teal-100 text-teal-800 ring-teal-200",
  REJECTED: "bg-red-100 text-red-800 ring-red-200",
  INCONCLUSIVE: "bg-orange-100 text-orange-800 ring-orange-200",
  PENDING_REVIEW: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  APPROVED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
};

export default function AdminPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selected, setSelected] = useState<DocItem | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [filter, setFilter] = useState<"all" | "pending">("pending");

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) router.push("/login");
  }, [user, loading, router]);

  const fetchDocs = useCallback(async () => {
    try {
      const endpoint =
        filter === "pending" ? "/documents/pending-review" : "/documents";
      const { data } = await api.get(endpoint);
      setDocs(data);
    } finally {
      setFetching(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const selectDoc = async (doc: DocItem) => {
    setSelected(doc);
    setReviewError("");
    setReason("");
    setAuditLoading(true);
    try {
      const { data } = await api.get(`/audit/${doc.id}`);
      setAudit(data);
    } finally {
      setAuditLoading(false);
    }
  };

  const submitReview = async (decision: "approved" | "rejected") => {
    if (!selected) return;
    setReviewing(true);
    setReviewError("");
    try {
      await api.post(`/verifications/${selected.id}/review`, {
        decision,
        reason: reason || undefined,
        version: selected.version,
      });
      setSelected(null);
      fetchDocs();
    } catch (err: any) {
      setReviewError(err.message);
    } finally {
      setReviewing(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-400">
        Loading...
      </div>
    );
  }

  const pendingCount = docs.filter((doc) => doc.status === "PENDING_REVIEW").length;
  const approvedCount = docs.filter((doc) => doc.status === "APPROVED").length;

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
              Admin operations
            </p>
            <h1 className="truncate text-lg font-semibold text-slate-950">
              Review Queue
            </h1>
            <p className="truncate text-sm text-slate-500">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Visible documents" value={String(docs.length)} />
          <Stat label="Needs review" value={String(pendingCount)} accent="indigo" />
          <Stat label="Approved" value={String(approvedCount)} accent="teal" />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
          <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Documents
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select a document to inspect status, details, and audit trail.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
              {(["pending", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    filter === f
                        ? "bg-slate-950 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
                  }`}
                >
                  {f === "pending" ? "Needs Review" : "All"}
                </button>
              ))}
              <button
                onClick={fetchDocs}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700"
              >
                Refresh
              </button>
            </div>
          </div>

          {docs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
              {filter === "pending"
                  ? "No documents awaiting review."
                : "No documents yet"}
            </div>
          ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
              {docs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => selectDoc(doc)}
                    className={`w-full border-b border-slate-100 bg-white px-4 py-4 text-left transition last:border-b-0 hover:bg-slate-50 ${
                    selected?.id === doc.id
                        ? "bg-indigo-50/60 ring-1 ring-inset ring-indigo-200"
                        : ""
                  }`}
                >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                        {doc.seller?.email}
                      </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                        {doc.fileName}
                      </p>
                    </div>
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${STATUS_BADGE[doc.status]}`}
                      >
                        {doc.status.replace(/_/g, " ")}
                      </span>
                        <span className="text-xs font-medium text-slate-400">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          </section>

          <aside className="space-y-4">
            {selected ? (
              <>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-950">
                      Document Detail
                    </h3>
                <button
                  onClick={() => setSelected(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-lg leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  ×
                </button>
              </div>
                  <div className="mt-4 space-y-2 text-sm">
                <Row label="Seller" value={selected.seller?.email} />
                <Row label="File" value={selected.fileName} />
                <Row
                  label="Size"
                  value={`${(selected.fileSize / 1024).toFixed(1)} KB`}
                />
                <Row
                  label="Status"
                  value={selected.status.replace(/_/g, " ")}
                />
                <Row
                  label="Uploaded"
                  value={new Date(selected.uploadedAt).toLocaleString()}
                />
              </div>
            </div>

            {selected.status === "PENDING_REVIEW" && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="font-semibold text-slate-950">
                      Admin Decision
                    </h3>
                <div>
                      <label className="mb-1.5 mt-4 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Reason (optional, shown to seller if rejected)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                        className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                        placeholder="e.g. Document is expired, illegible, or incorrect type..."
                  />
                </div>
                {reviewError && (
                      <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {reviewError}
                  </p>
                )}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => submitReview("approved")}
                    disabled={reviewing}
                        className="rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => submitReview("rejected")}
                    disabled={reviewing}
                        className="rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 font-semibold text-slate-950">
                Audit History
              </h3>
              {auditLoading ? (
                    <p className="text-xs text-slate-400">Loading...</p>
              ) : audit.length === 0 ? (
                    <p className="text-xs text-slate-400">No events yet</p>
              ) : (
                    <ol className="relative ml-2 space-y-4 border-l border-slate-200">
                  {audit.map((event) => (
                    <li key={event.id} className="ml-4">
                          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-indigo-300" />
                          <p className="text-xs font-semibold text-slate-800">
                        {event.action.replace(/_/g, " ")}
                      </p>
                          <p className="text-xs text-slate-400">
                        by {event.actorRole} ·{" "}
                        {new Date(event.createdAt).toLocaleString()}
                      </p>
                      {event.metadata?.reason && (
                            <p className="mt-1 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">
                          "{event.metadata.reason}"
                        </p>
                      )}
                      {event.fromStatus && (
                            <p className="mt-1 text-xs text-slate-400">
                          {event.fromStatus} → {event.toStatus}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Select a document to view details and complete review actions.
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <span className="flex-shrink-0 text-slate-500">{label}</span>
      <span className="truncate text-right font-medium text-slate-800">
        {value ?? "-"}
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = "slate",
}: {
  label: string;
  value: string;
  accent?: "slate" | "indigo" | "teal";
}) {
  const accentClass =
    accent === "indigo"
      ? "text-indigo-700"
      : accent === "teal"
        ? "text-teal-700"
        : "text-slate-950";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold ${accentClass}`}>{value}</p>
    </div>
  );
}
