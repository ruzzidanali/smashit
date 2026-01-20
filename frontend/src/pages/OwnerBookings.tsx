import React, { useEffect, useState } from "react";
import {
  adminCancelBooking,
  adminGetBookings,
  adminVerifyPayment,
  adminRejectPayment,
} from "../services/adminApi";
import type { AdminBooking } from "../services/adminApi";
import { API_BASE_URL } from "../config";
import ImageModal from "../components/ImageModal";

function todayYYYYMMDD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmt(min: number) {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function paymentBadgeClass(status?: string) {
  const s = status || "PENDING";
  if (s === "VERIFIED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "SUBMITTED") return "bg-amber-50 text-amber-800 border-amber-200";
  if (s === "REJECTED") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

export default function OwnerBookings() {
  const [date, setDate] = useState(todayYYYYMMDD());
  const [items, setItems] = useState<AdminBooking[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<
    "ALL" | "PENDING" | "SUBMITTED" | "VERIFIED" | "REJECTED"
  >("ALL");

  // modal state
  const [proofOpen, setProofOpen] = useState(false);
  const [proofSrc, setProofSrc] = useState<string | null>(null);

  function openProof(proofPath: string) {
    setProofSrc(`${API_BASE_URL}${proofPath}`);
    setProofOpen(true);
  }

  async function load(d: string) {
    setErr(null);
    setBusy(true);
    try {
      const data = await adminGetBookings(d);
      setItems(data);
    } catch (e: unknown) {
      setItems([]);
      setErr((e instanceof Error ? e.message : String(e)) || "Failed to load bookings");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cancel(id: number) {
    if (!confirm("Cancel this booking?")) return;
    setErr(null);
    try {
      await adminCancelBooking(id);
      await load(date);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function verify(id: number) {
    setErr(null);
    setVerifyingId(id);
    try {
      await adminVerifyPayment(id);
      await load(date);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setVerifyingId(null);
    }
  }

  async function reject(id: number) {
    if (!confirm("Mark this payment as NOT VALID?")) return;

    setErr(null);
    try {
      await adminRejectPayment(id);
      await load(date);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  const filteredItems = items.filter((b) => {
    const ps = (b.paymentStatus || "PENDING") as string;
    if (filter === "ALL") return true;
    return ps === filter;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-outfit font-bold text-slate-900">Bookings</h1>
            <p className="text-sm text-slate-500 mt-1">
              View bookings by date, verify payment proof, and cancel if needed.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Date</label>
            <div className="flex gap-2 mt-1">
              <input
                type="date"
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-green-200"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <button
                onClick={() => load(date)}
                className="h-11 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60"
                disabled={busy}
              >
                {busy ? "Loading..." : "Load"}
              </button>
            </div>
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">
            {err}
          </div>
        )}

        {/* FILTER TABS */}
        <div className="mt-6 flex flex-wrap gap-2">
          {(["ALL", "PENDING", "SUBMITTED", "VERIFIED", "REJECTED"] as const).map((k) => {
            const active = filter === k;
            const label = k === "ALL" ? "All" : k.charAt(0) + k.slice(1).toLowerCase();

            return (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={[
                  "h-9 rounded-xl px-3 text-sm font-semibold border transition",
                  active
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Court</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">Payment</th>
                <th className="py-2 pr-0 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="text-slate-900">
              {busy && (
                <tr>
                  <td className="py-3" colSpan={6}>
                    Loading...
                  </td>
                </tr>
              )}

              {!busy && filteredItems.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={6}>
                    No bookings.
                  </td>
                </tr>
              )}

              {filteredItems.map((b) => (
                <tr
                  key={b.id}
                  className={[
                    "border-t border-slate-100",
                    (b.paymentStatus || "PENDING") === "SUBMITTED" ? "bg-amber-50/40" : "",
                  ].join(" ")}
                >
                  <td className="py-3 pr-4 font-semibold">
                    {fmt(b.startMinutes)}–{fmt(b.endMinutes)}
                  </td>

                  <td className="py-3 pr-4">{b.court?.name || `Court #${b.courtId}`}</td>
                  <td className="py-3 pr-4">{b.customerName}</td>
                  <td className="py-3 pr-4">{b.phone}</td>

                  <td className="py-3 pr-4">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentBadgeClass(
                          b.paymentStatus
                        )}`}
                      >
                        {b.paymentStatus || "PENDING"}
                      </span>

                      {b.paymentProof ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openProof(b.paymentProof!)}
                            className="shrink-0"
                            title="View proof"
                          >
                            <img
                              src={`${API_BASE_URL}${b.paymentProof}`}
                              alt="Payment Proof"
                              className="h-10 w-10 rounded-xl border border-slate-200 object-cover hover:opacity-90"
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() => openProof(b.paymentProof!)}
                            className="text-xs font-semibold text-emerald-700 hover:underline"
                          >
                            Proof
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">No proof</span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 pr-0 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => verify(b.id)}
                        disabled={!b.paymentProof || b.paymentStatus === "VERIFIED" || verifyingId === b.id}
                        className="h-9 px-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {b.paymentStatus === "VERIFIED"
                          ? "Verified"
                          : verifyingId === b.id
                          ? "Verifying..."
                          : "Mark Verified"}
                      </button>

                      <button
                        onClick={() => reject(b.id)}
                        disabled={!b.paymentProof || b.paymentStatus === "VERIFIED"}
                        className="h-9 px-3 rounded-xl border border-amber-200 text-amber-800 font-semibold hover:bg-amber-50 disabled:opacity-50"
                      >
                        Not Valid
                      </button>

                      <button
                        onClick={() => cancel(b.id)}
                        className="h-9 px-3 rounded-xl border border-red-200 text-red-700 font-semibold hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 text-xs text-slate-500">Tip: Click Proof to preview in a modal.</div>
        </div>
      </div>

      {proofSrc && (
        <ImageModal
          open={proofOpen}
          src={proofSrc}
          title="Payment proof"
          onClose={() => setProofOpen(false)}
        />
      )}
    </div>
  );
}
