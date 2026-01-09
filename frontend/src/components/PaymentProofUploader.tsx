import { useState } from "react";
import { publicUploadPaymentProof } from "../services/api";
import { API_BASE } from "../config";
import { Trash2 } from "lucide-react";

export default function PaymentProofUploader(props: {
  bookingId: number;
  phone: string;
  onUploaded?: (proofUrl: string) => void;
}) {
  const { bookingId, phone, onUploaded } = props;
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okUrl, setOkUrl] = useState<string | null>(null);

  async function upload() {
    if (!file) {
      setErr("Please choose an image first.");
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      const res = await publicUploadPaymentProof({ bookingId, phone, file });
      setOkUrl(res.paymentProof);
      onUploaded?.(res.paymentProof);
    } catch (e: unknown) {
      setErr(
        (e instanceof Error ? e.message : "Upload failed.") || "Upload failed."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-extrabold text-slate-900">
        Upload Payment Proof
      </div>
      <div className="mt-1 text-sm text-slate-600">
        Upload a screenshot/receipt. Owner will verify it.
      </div>

      {err && (
        <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 border border-rose-200">
          {err}
        </div>
      )}

      {okUrl && (
        <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 border border-emerald-200">
          Uploaded!{" "}
          <a
            className="font-semibold underline"
            href={`${API_BASE}${okUrl}`}
            target="_blank"
            rel="noreferrer"
          >
            View file
          </a>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Hidden native input */}
        <input
          id={`proof-${bookingId}`}
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden"
        />

        {/* Choose + filename + remove */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* Choose file */}
          <label
            htmlFor={`proof-${bookingId}`}
            className="inline-flex h-10 shrink-0 cursor-pointer select-none items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[0.99]"
          >
            Choose file
          </label>

          {/* Filename */}
          <div className="min-w-0 flex-1">
            {file ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="truncate text-sm text-slate-700">
                  {file.name}
                </span>

                {/* Remove */}
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
                No file selected
              </div>
            )}
          </div>
        </div>

        {/* Upload */}
        <button
          onClick={upload}
          disabled={busy || !bookingId || !file}
          className="h-10 w-full sm:w-auto rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "Uploading..." : "Upload"}
        </button>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Booking ID: <span className="font-mono">{bookingId}</span>
      </div>
    </div>
  );
}
