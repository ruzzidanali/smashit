import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Info, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import type { Court } from "../types";
import { getCourts, getAvailability } from "../services/api";
import CourtGrid from "../components/CourtGrid";
import BookingModal from "../components/BookingModal";
import Toast, { type ToastState } from "../components/Toast";
import { fmtRange } from "../utils/time";

/* ---------------- helpers ---------------- */
function todayYYYYMMDD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getLastSlug() {
  return localStorage.getItem("smashit_last_slug") || "";
}

/* ---------------- page ---------------- */
export default function ReservePage() {
  const navigate = useNavigate();
  const { slug: slugParam } = useParams<{ slug?: string }>();
  const slug = (slugParam || "").trim();

  const [slugInput, setSlugInput] = useState(getLastSlug());
  const [date, setDate] = useState(todayYYYYMMDD());

  const [bizName, setBizName] = useState<string | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [availability, setAvailability] = useState<
    { id: number; courtId: number; startMinutes: number; endMinutes: number }[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{
    startMinutes: number;
    endMinutes: number;
  } | null>(null);

  const selectedCourt = useMemo(
    () => courts.find((c) => c.id === selectedCourtId) || null,
    [courts, selectedCourtId]
  );

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
  });

  /* ---------------- data load ---------------- */
  async function load(activeSlug: string) {
    setLoading(true);
    setError(null);
    try {
      const [{ business, courts }, a] = await Promise.all([
        getCourts(activeSlug),
        getAvailability(activeSlug, date),
      ]);

      setBizName(business?.name ?? null);
      setCourts(courts);
      setAvailability(a.bookings);
      localStorage.setItem("smashit_last_slug", activeSlug);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load booking data");
      setBizName(null);
      setCourts([]);
      setAvailability([]);
    } finally {
      setLoading(false);
    }
  }

  /* Load only when slug exists */
  useEffect(() => {
    if (!slug) return;
    load(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, date]);

  /* ---------------- UI ---------------- */
  return (
    <div className="grid gap-6">
      {/* ---------------- DISCOVERY MODE (no slug) ---------------- */}
      {!slug && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <Info size={14} />
              Multi-owner platform
            </div>

            <h1 className="font-outfit text-2xl font-extrabold text-slate-900 md:text-3xl">
              Find a badminton court
            </h1>

            <p className="text-slate-600">
              Please open a business booking page using a link like:
              <span className="ml-2 rounded-lg bg-slate-50 px-2 py-1 font-mono text-sm text-slate-700 ring-1 ring-slate-200">
                #/b/ace-badminton-center
              </span>
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr,auto] md:items-end">
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Business slug
              </label>
              <input
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
                placeholder="e.g. ace-badminton-center"
                className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <button
              onClick={() => {
                const next = slugInput.trim();
                if (next) navigate(`/b/${next}`);
              }}
              className="h-10 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Go
            </button>
          </div>
        </div>
      )}

      {/* ---------------- BUSINESS BOOKING MODE ---------------- */}
      {slug && (
        <>
          {/* Hero */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-4 p-6 md:grid-cols-[1.2fr,0.8fr] md:items-center">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                  <Info size={14} />
                  Instant booking · conflict-safe
                </div>

                <h1 className="font-outfit text-3xl font-extrabold text-slate-900 md:text-4xl">
                  {bizName || "Loading business…"}
                </h1>

                <p className="text-slate-600">
                  Choose a date, pick a slot, and reserve your court.
                </p>

                <div className="text-xs text-slate-500">
                  Business link: <span className="font-mono">#/b/{slug}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="text-xs font-semibold text-slate-600">
                  Select date
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white ring-1 ring-slate-200">
                    <CalendarDays size={18} />
                  </div>
                  <input
                    type="date"
                    value={date}
                    min={todayYYYYMMDD()}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Courts grid */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between px-2 pb-3">
              <div>
                <div className="font-outfit text-lg font-extrabold text-slate-900">
                  Available Courts
                </div>
                <div className="text-sm text-slate-500">
                  Tap a free slot to reserve
                </div>
              </div>

              <button
                onClick={() => load(slug)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="grid place-items-center py-16 text-slate-500">
                <Loader2 className="animate-spin" size={18} />
                Loading courts…
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {error}
              </div>
            ) : (
              <CourtGrid
                date={date}
                courts={courts}
                bookings={availability}
                onPick={(courtId, slot) => {
                  setSelectedCourtId(courtId);
                  setSelectedSlot(slot);
                  setOpen(true);
                }}
              />
            )}
          </div>

          {/* Booking modal */}
          <BookingModal
            open={open}
            onClose={() => setOpen(false)}
            slug={slug}
            date={date}
            court={selectedCourt}
            slot={selectedSlot}
            onBooked={() => {
              if (selectedCourt && selectedSlot) {
                setToast({
                  open: true,
                  message: `${selectedCourt.name} · ${date} · ${fmtRange(
                    selectedSlot.startMinutes,
                    selectedSlot.endMinutes
                  )} booked`,
                });
              }
              setOpen(false);
              load(slug);
            }}
          />
        </>
      )}

      {/* Toast */}
      <Toast
        toast={toast}
        onClose={() => setToast({ open: false, message: "" })}
      />
    </div>
  );
}
