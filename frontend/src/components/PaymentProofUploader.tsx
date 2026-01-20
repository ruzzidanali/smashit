import { useState } from "react";
import { publicUploadPaymentProof } from "../services/api";
import { API_BASE } from "../config";
import { Trash2 } from "lucide-react";
import ImageModal from "./ImageModal";

export default function PaymentProofUploader(props: {
  bookingId: number;
  phone: string;
  paymentStatus?: string;
  paymentProof?: string | null;
  onUploaded?: (proofUrl: string) => void;
}) {
  const { bookingId, phone, onUploaded } = props;

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okUrl, setOkUrl] = useState<string | null>(null);

  const [openProof, setOpenProof] = useState(false);

  const status = props.paymentStatus || "PENDING";
  const proofExists = !!props.paymentProof;

  // latest upload wins
  const proofPath = okUrl ?? props.paymentProof ?? null;
  const proofSrc = proofPath ? `${API_BASE}${proofPath}` : null;

  // lock rules:
  // - VERIFIED: locked
  // - SUBMITTED: locked
  // - proof exists + not REJECTED: locked
  // - REJECTED: allow upload again
  const locked =
    status === "VERIFIED" ||
    status === "SUBMITTED" ||
    (proofExists && status !== "REJECTED");

  const disabledBecauseSubmitted = status === "SUBMITTED";
  const disabledBecauseVerified = status === "VERIFIED";

  async function upload() {
    if (locked) return;

    if (!file) {
      setErr("Please choose an image first.");
      return;
    }

    setBusy(true);
    setErr(null);

    try {
      const res = await publicUploadPaymentProof({ bookingId, phone, file });
      setOkUrl(res.paymentProof);
      setFile(null);
      onUploaded?.(res.paymentProof);
    } catch (e: unknown) {
      setErr((e instanceof Error ? e.message : "Upload failed.") || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold text-slate-900">Payment Proof</div>
          <div className="mt-1 text-sm text-slate-600">
            Upload a screenshot/receipt. Owner will verify it.
          </div>
        </div>

        {/* Proof link (opens modal) */}
        {proofSrc && (
          <button
            type="button"
            onClick={() => setOpenProof(true)}
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            title="View proof"
          >
            Proof
          </button>
        )}
      </div>

      {err && (
        <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 border border-rose-200">
          {err}
        </div>
      )}

      {/* status messages */}
      {status === "SUBMITTED" && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Payment proof submitted. Waiting for owner verification.
        </div>
      )}

      {status === "VERIFIED" && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Payment verified
        </div>
      )}

      {status === "REJECTED" && (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Payment proof rejected. Please upload a valid proof again.
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Hidden native input */}
        <input
          id={`proof-${bookingId}`}
          type="file"
          accept="image/*"
          disabled={locked}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden"
        />

        {/* Choose + filename + remove */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <label
            htmlFor={`proof-${bookingId}`}
            className={[
              "inline-flex h-10 shrink-0 select-none items-center justify-center rounded-xl border px-4 text-sm font-semibold shadow-sm",
              locked
                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                : "cursor-pointer border-slate-200 bg-white text-slate-800 hover:bg-slate-50 active:scale-[0.99]",
            ].join(" ")}
            title={locked ? "Upload disabled" : "Choose an image"}
          >
            Choose file
          </label>

          <div className="min-w-0 flex-1">
            {file ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="truncate text-sm text-slate-700">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  title="Remove file"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div className="truncate rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 text-sm text-slate-400">
                {locked ? "Upload locked" : "No file selected"}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={upload}
          disabled={busy || !bookingId || !file || locked}
          className="h-10 w-full sm:w-auto rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy
            ? "Uploading..."
            : disabledBecauseSubmitted
            ? "Submitted"
            : disabledBecauseVerified
            ? "Verified"
            : proofExists && status !== "REJECTED"
            ? "Uploaded"
            : "Upload"}
        </button>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Booking ID: <span className="font-mono">{bookingId}</span>
      </div>

      {/* Modal */}
      {proofSrc && (
        <ImageModal
          open={openProof}
          src={proofSrc}
          title="Payment proof"
          onClose={() => setOpenProof(false)}
        />
      )}
    </div>
  );
}
