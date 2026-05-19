"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";

type DocumentStatus =
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "REJECTED"
  | "INCONCLUSIVE"
  | "PENDING_REVIEW"
  | "APPROVED";

interface DocData {
  id: string;
  status: DocumentStatus;
  fileName: string;
  fileSize: number;
  rejectionReason: string | null;
  uploadedAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; color: string; description: string }
> = {
  PENDING_VERIFICATION: {
    label: "Pending Verification",
    color: "bg-amber-100 text-amber-800 ring-amber-200",
    description: "Your document is in the verification queue.",
  },
  VERIFIED: {
    label: "Verified",
    color: "bg-teal-100 text-teal-800 ring-teal-200",
    description: "Document verified by automated system.",
  },
  REJECTED: {
    label: "Rejected",
    color: "bg-red-100 text-red-800 ring-red-200",
    description: "Your document could not be verified.",
  },
  INCONCLUSIVE: {
    label: "Under Review",
    color: "bg-orange-100 text-orange-800 ring-orange-200",
    description: "Automated check was inconclusive.",
  },
  PENDING_REVIEW: {
    label: "Awaiting Admin Review",
    color: "bg-indigo-100 text-indigo-800 ring-indigo-200",
    description: "An admin will review your document shortly.",
  },
  APPROVED: {
    label: "Approved",
    color: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    description: "Your seller account is now active.",
  },
};

export default function SellerPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [doc, setDoc] = useState<DocData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    if (!loading && (!user || user.role !== "SELLER")) router.push("/login");
  }, [user, loading, router]);

  const fetchDoc = useCallback(async () => {
    try {
      const { data } = await api.get("/documents/my");
      setDoc(data);
    } catch {
      setDoc(null);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/documents/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDoc(data);
      setFile(null);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-400">
        Loading...
      </div>
    );
  }

  const statusCfg = doc ? STATUS_CONFIG[doc.status] : null;

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-600">
              Seller workspace
            </p>
            <h1 className="truncate text-lg font-semibold text-slate-950">
              Document Verification
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

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-10">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Verification steps
          </p>
          <div className="mt-5 space-y-4">
            {[
              ["Upload", doc ? "Complete" : "Ready"],
              ["Automated check", doc ? "In progress" : "Waiting"],
              ["Final review", doc?.status === "APPROVED" ? "Complete" : "Queued"],
            ].map(([label, value], index) => (
              <div key={label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      index === 0 && doc
                        ? "bg-teal-600 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {index + 1}
                  </span>
                  {index < 2 && <span className="h-8 w-px bg-slate-200" />}
                </div>
                <div className="pb-3">
                  <p className="text-sm font-semibold text-slate-800">{label}</p>
                  <p className="text-sm text-slate-500">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {doc ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Current file
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">
                  Verification Status
                </h2>
                <p className="mt-1 break-all text-sm text-slate-500">
                  {doc.fileName}
                </p>
              </div>
              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusCfg?.color}`}
              >
                {statusCfg?.label}
              </span>
            </div>

            <p className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              {statusCfg?.description}
            </p>

            {doc.rejectionReason && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-semibold text-red-800">
                  Rejection reason
                </p>
                <p className="mt-1 text-sm leading-6 text-red-700">
                  {doc.rejectionReason}
                </p>
              </div>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Meta label="Uploaded" value={new Date(doc.uploadedAt).toLocaleString()} />
              <Meta label="Last updated" value={new Date(doc.updatedAt).toLocaleString()} />
            </div>

            <button
              onClick={fetchDoc}
              className="mt-5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-300 hover:text-teal-700"
            >
              Refresh status
            </button>
          </section>
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Upload
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              Upload Verification Document
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Upload your business license or tax registration document to begin
              verification. Accepted formats: PDF, JPEG, PNG (max 10MB).
            </p>

            <form onSubmit={handleUpload} className="mt-5 space-y-4">
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center transition hover:border-teal-300 hover:bg-teal-50/40">
                <input
                  type="file"
                  id="file-input"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  {file ? (
                    <div>
                      <p className="break-all text-sm font-semibold text-teal-700">
                        {file.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Click to select a file
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        PDF, JPEG, PNG up to 10MB
                      </p>
                    </div>
                  )}
                </label>
              </div>

              {uploadError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {uploadError}
                </p>
              )}

              <button
                type="submit"
                disabled={!file || uploading}
                className="w-full rounded-lg bg-slate-950 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Submit Document"}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-700">{value}</p>
    </div>
  );
}
