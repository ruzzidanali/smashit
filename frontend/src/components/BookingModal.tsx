import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import type { Court } from "../types";
import { accountMe, createBooking } from "../services/api";
import { fmtRange } from "../utils/time";
import { useNavigate } from "react-router-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  slug: string;
  date: string;
  court: Court | null;
  slot: { startMinutes: number; endMinutes: number } | null;
  priceCents?: number;

  // booking mode (passed from ReservePage)
  bookingMode?: "account" | "guest";

  onBooked: (booking: { id: number; phone: string }) => void;
};

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function BookingModal({
  open,
  onClose,
  slug,
  date,
  court,
  slot,
  priceCents = 0,
  bookingMode = "guest",
  onBooked,
}: Props) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const nav = useNavigate();
  const userToken = localStorage.getItem("smashit_user_token");

  const needsLogin = bookingMode === "account" && !userToken;
  const lockInputs = bookingMode === "account" && !!userToken;

  useEffect(() => {
    if (!open) return;

    setErr(null);
    setOk(null);

    // default: guest behavior uses last phone
    const lastPhone = localStorage.getItem("smashit_last_phone") || "";
    setPhone(lastPhone);
    setCustomerName("");

    // account booking: auto-fill from /api/account/me
    (async () => {
      if (bookingMode !== "account") return;
      if (!userToken) return;

      setPrefillLoading(true);
      try {
        const r = await accountMe();
        setCustomerName((v) => (v.trim() ? v : r.account.name || ""));
        setPhone((v) => (v.trim() ? v : r.account.phone || ""));
      } catch {
        // ignore; user can still type if you allow
      } finally {
        setPrefillLoading(false);
      }
    })();
  }, [open, bookingMode, userToken]);

  const canSubmit = useMemo(() => {
    return !!(
      court &&
      slot &&
      customerName.trim() &&
      phone.trim() &&
      !loading &&
      !prefillLoading &&
      !needsLogin
    );
  }, [court, slot, customerName, phone, loading, prefillLoading, needsLogin]);

  const priceText = useMemo(() => {
    const rm = (Number(priceCents) || 0) / 100;
    return `RM ${rm.toFixed(2)}`;
  }, [priceCents]);

  async function submit() {
    if (needsLogin) {
      setErr("Please login to book with account.");
      return;
    }
    if (!court || !slot) return;

    setLoading(true);
    setErr(null);
    setOk(null);

    try {
      const cleanName = customerName.trim();
      const cleanPhone = phone.trim();

      const created = await createBooking(slug, {
        courtId: court.id,
        date,
        startMinutes: slot.startMinutes,
        endMinutes: slot.endMinutes,
        customerName: cleanName,
        phone: cleanPhone,
      });

      setOk("Booking confirmed!");

      // keep phone so user can check My Bookings easily (guest-friendly)
      localStorage.setItem("smashit_last_phone", cleanPhone);

      window.dispatchEvent(new Event("smashit-booking-changed"));

      // optional: reset only in guest mode
      if (bookingMode === "guest") {
        setCustomerName("");
      }

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
            <div className="font-outfit text-lg font-extrabold text-slate-900">
              Confirm booking
            </div>
            <div className="text-sm text-slate-500">
              {court?.name || "Court"} · {date} ·{" "}
              {slot ? fmtRange(slot.startMinutes, slot.endMinutes) : ""}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Booking as:{" "}
              <span className="font-semibold">
                {bookingMode === "account" ? "Account" : "Guest"}
              </span>
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

          {needsLogin && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              You selected <span className="font-semibold">Account</span>{" "}
              booking.
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-amber-700">
                  Please login to continue (so this booking is saved to your
                  account).
                </span>

                <button
                  onClick={() => nav("/login", { state: { from: `/b/${slug}` } })}
                  className="h-9 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-black"
                >
                  Login
                </button>
              </div>
            </div>
          )}

          {prefillLoading && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 inline-flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              Loading your profile…
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Slot</span>
              <span className="font-semibold text-slate-900">
                {slot ? fmtRange(slot.startMinutes, slot.endMinutes) : "-"}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-600">Price</span>
              <span className="font-semibold text-slate-900">{priceText}</span>
            </div>

            <div className="mt-3 border-t border-slate-200 pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Total</span>
              <span className="text-base font-extrabold text-slate-900">
                {priceText}
              </span>
            </div>
          </div>

          <div className="grid gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Name</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Your name"
                disabled={lockInputs}
                className={cx(
                  "mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200",
                  lockInputs
                    ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                    : "bg-white"
                )}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0123456789"
                disabled={lockInputs}
                className={cx(
                  "mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200",
                  lockInputs
                    ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                    : "bg-white"
                )}
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
            Conflicts are automatically blocked by the backend. Past slots are
            rejected too.
          </div>
        </div>
      </div>
    </div>
  );
}
