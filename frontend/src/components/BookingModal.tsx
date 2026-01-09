import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import type { Court } from "../types";
import { createBooking } from "../services/api";
import { fmtRange } from "../utils/time";

type Props = {
  open: boolean;
  onClose: () => void;
  slug: string;
  date: string;
  court: Court | null;
  slot: { startMinutes: number; endMinutes: number } | null;
  onBooked: (booking: { id: number; phone: string }) => void;
};

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function BookingModal({ open, onClose, slug, date, court, slot, onBooked }: Props) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setErr(null);
      setOk(null);
    }
  }, [open]);

  const canSubmit = useMemo(() => {
    return !!(court && slot && customerName.trim() && phone.trim() && !loading);
  }, [court, slot, customerName, phone, loading]);

  async function submit() {
    if (!court || !slot) return;
    setLoading(true);
    setErr(null);
    setOk(null);
    try {
      const created = await createBooking(slug, {
        courtId: court.id,
        date,
        startMinutes: slot.startMinutes,
        endMinutes: slot.endMinutes,
        customerName: customerName.trim(),
        phone: phone.trim(),
      });
      setOk("Booking confirmed!");
      const cleanPhone = phone.trim();
      // keep phone so user can check My Bookings easily
      localStorage.setItem("smashit_last_phone", cleanPhone);
      setCustomerName("");
      onBooked({ id: created.id, phone: cleanPhone });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to create booking");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <div className="font-outfit text-lg font-extrabold text-slate-900">Confirm booking</div>
            <div className="text-sm text-slate-500">
              {court?.name || "Court"} · {date} · {slot ? fmtRange(slot.startMinutes, slot.endMinutes) : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 px-5 py-5">
          {err && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {err}
            </div>
          )}
          {ok && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {ok}
            </div>
          )}

          <div className="grid gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Name</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Your name"
                className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0123456789"
                className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>

          <button
            onClick={submit}
            disabled={!canSubmit}
            className={cx(
              "h-11 rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition",
              canSubmit ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-300"
            )}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                Booking...
              </span>
            ) : (
              "Confirm booking"
            )}
          </button>

          <div className="text-xs text-slate-500">
            Conflicts are automatically blocked by the backend. Past slots are rejected too.
          </div>
        </div>
      </div>
    </div>
  );
}
