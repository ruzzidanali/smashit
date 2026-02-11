import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Phone, User, Trash2 } from "lucide-react";
import {
  cancelBooking,
  listBookings,
  listMyAccountBookings,
  cancelMyAccountBooking,
} from "../services/api";
import type { Booking } from "../types";
import { fmtRange } from "../utils/time";
import PaymentProofUploader from "../components/PaymentProofUploader";

function getLastSlug() {
  return localStorage.getItem("smashit_last_slug") || "";
}

function getLastPhone() {
  return localStorage.getItem("smashit_last_phone") || "";
}

function hiddenKey(slug: string) {
  return `smashit_hidden_bookings:${slug.trim()}`;
}

function getHiddenIds(slug: string): number[] {
  try {
    return JSON.parse(localStorage.getItem(hiddenKey(slug)) || "[]");
  } catch {
    return [];
  }
}

function addHiddenId(slug: string, id: number) {
  const set = new Set(getHiddenIds(slug));
  set.add(id);
  localStorage.setItem(hiddenKey(slug), JSON.stringify([...set]));
}

function hiddenKeyAccount() {
  return `smashit_hidden_account_bookings`;
}

function getHiddenAccountIds(): number[] {
  try {
    return JSON.parse(localStorage.getItem(hiddenKeyAccount()) || "[]");
  } catch {
    return [];
  }
}

function addHiddenAccountId(id: number) {
  const set = new Set(getHiddenAccountIds());
  set.add(id);
  localStorage.setItem(hiddenKeyAccount(), JSON.stringify([...set]));
}

function paymentLabel(ps?: string) {
  switch (ps) {
    case "VERIFIED":
      return { cls: "bg-emerald-50 text-emerald-700", text: "Payment Verified" };
    case "SUBMITTED":
      return { cls: "bg-amber-50 text-amber-800", text: "Waiting Verification" };
    case "REJECTED":
      return { cls: "bg-rose-50 text-rose-700", text: "Payment Rejected" };
    default:
      return { cls: "bg-slate-100 text-slate-700", text: "Payment Pending" };
  }
}

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const params = useParams<{ slug?: string }>();
  const slug = (params.slug || getLastSlug()).trim();

  const userToken = localStorage.getItem("smashit_user_token");
  const isAccount = !!userToken;

  const [mode, setMode] = useState<"phone" | "name">("phone");
  const [query, setQuery] = useState(getLastPhone());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Booking[]>([]);
  const [businessName, setBusinessName] = useState<string>("");

  const [confirmId, setConfirmId] = useState<number | null>(null);

  const isFinal = (b: Booking) =>
    b.status === "CANCELLED" || b.paymentStatus === "VERIFIED";

  const grouped = useMemo(() => {
    const m = new Map<string, Booking[]>();
    for (const b of items) {
      const key = b.date;
      const arr = m.get(key) || [];
      arr.push(b);
      m.set(key, arr);
    }
    return Array.from(m.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);

  async function loadGuest() {
    setLoading(true);
    setError(null);

    try {
      if (!slug) throw new Error("Missing business slug.");
      if (!query.trim()) throw new Error("Enter phone number or name.");

      const data = await listBookings(slug, {
        phone: mode === "phone" ? query.trim() : undefined,
        name: mode === "name" ? query.trim() : undefined,
      });

      if (mode === "phone") {
        localStorage.setItem("smashit_last_phone", query.trim());
      }

      setBusinessName(data.business?.name || "");
      const hidden = new Set(getHiddenIds(slug));
      setItems((data.bookings || []).filter((b) => !hidden.has(b.id)));
    } catch (e: unknown) {
      setItems([]);
      setBusinessName("");
      setError(e instanceof Error ? e.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }

  async function loadAccount() {
    setLoading(true);
    setError(null);

    try {
      const data = await listMyAccountBookings();
      setBusinessName("your account");

      const hidden = new Set(getHiddenAccountIds());
      setItems((data.bookings || []).filter((b) => !hidden.has(b.id)));
    } catch (e: unknown) {
      setItems([]);
      setBusinessName("");
      setError(e instanceof Error ? e.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAccount) {
      loadAccount();
      return;
    }
    if (slug && query.trim()) {
      loadGuest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAccount]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (isAccount) {
        loadAccount();
        return;
      }
      if (slug && query.trim()) {
        loadGuest();
      }
    }, 15000);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAccount, slug, query, mode]);

  async function confirmCancel() {
    if (!confirmId) return;

    try {
      if (isAccount) {
        await cancelMyAccountBooking(confirmId);
        await loadAccount();
        setConfirmId(null);
        return;
      }

      if (!slug) throw new Error("Missing business slug.");

      const booking = items.find((x) => x.id === confirmId);
      if (!booking) throw new Error("Booking not found in list.");

      await cancelBooking(slug, confirmId, booking.phone);
      await loadGuest();

      setConfirmId(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to cancel booking");
    }
  }

  return (
    <div className="grid gap-6">
      {/* SEARCH CARD */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="font-outfit text-2xl font-extrabold text-slate-900">
          My Bookings
        </h1>

        <p className="mt-1 text-slate-600">
          {isAccount ? (
            <>
              Your reservations under <span className="font-semibold">your account</span>
            </>
          ) : (
            <>
              Find your reservations for{" "}
              <span className="font-semibold">{businessName || "this court"}</span>
            </>
          )}
        </p>

        {/* Guest UI only */}
        {!isAccount && (
          <>
            {!slug && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Open My Bookings from a business page first.
                <div className="mt-3">
                  <button
                    onClick={() => navigate(`/b/${getLastSlug() || "ace-badminton-center"}`)}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
                  >
                    Go to booking page
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setMode("phone")}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
                  mode === "phone"
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-200 text-slate-600"
                }`}
              >
                Phone
              </button>
              <button
                onClick={() => setMode("name")}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
                  mode === "name"
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-200 text-slate-600"
                }`}
              >
                Name
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr,auto] md:items-end">
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  {mode === "phone" ? "Phone number" : "Customer name"}
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
                    {mode === "phone" ? <Phone size={18} /> : <User size={18} />}
                  </div>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={mode === "phone" ? "e.g. 0123456789" : "e.g. Ahmad"}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              </div>

              <button
                onClick={loadGuest}
                disabled={!query.trim() || loading || !slug}
                className="h-10 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} />
                    Loading
                  </span>
                ) : (
                  "Find bookings"
                )}
              </button>
            </div>
          </>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}
      </div>

      {/* RESULTS */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        {!items.length ? (
          <div className="grid place-items-center py-16 text-slate-500">
            {loading ? "Loading..." : "No bookings found"}
          </div>
        ) : (
          <div className="grid gap-3">
            {grouped.map(([date, arr]) => (
              <div key={date} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="font-outfit font-extrabold text-slate-900">{date}</div>

                <div className="mt-3 grid gap-2">
                  {arr.map((b) => {
                    const isCancelled = b.status === "CANCELLED";

                    if (isCancelled) {
                      return (
                        <div
                          key={b.id}
                          className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold text-rose-800">
                              Reservation has been cancelled by Admin
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 border border-rose-100">
                                {b.court?.name ?? `Court #${b.courtId}`}
                              </span>
                              <span className="rounded-full bg-white/70 px-3 py-1 text-xs text-slate-700 border border-rose-100">
                                {fmtRange(b.startMinutes, b.endMinutes)}
                              </span>
                              <span className="rounded-full bg-white/70 px-3 py-1 text-xs text-slate-700 border border-rose-100">
                                {b.customerName} • {b.phone}
                              </span>
                              {isAccount && b.business?.name && (
                                <span className="rounded-full bg-white/70 px-3 py-1 text-xs text-slate-700 border border-rose-100">
                                  {b.business.name}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              if (isAccount) {
                                addHiddenAccountId(b.id);
                              } else if (slug) {
                                addHiddenId(slug.trim(), b.id);
                              }
                              setItems((prev) => prev.filter((x) => x.id !== b.id));
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                            title="Remove from list"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={b.id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:justify-between"
                      >
                        <div>
                          <div className="flex gap-2 flex-wrap">
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              {b.court?.name}
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                              {fmtRange(b.startMinutes, b.endMinutes)}
                            </span>
                            {isAccount && b.business?.name && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                                {b.business.name}
                              </span>
                            )}
                          </div>

                          {(() => {
                            const p = paymentLabel(b.paymentStatus);
                            return (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${p.cls}`}>
                                  {p.text}
                                </span>

                                {b.paymentStatus === "REJECTED" && (
                                  <span className="text-xs text-rose-700">
                                    Please upload a valid payment proof.
                                  </span>
                                )}

                                {b.paymentStatus === "VERIFIED" && (
                                  <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700">
                                    Thank you! Your payment has been verified.
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          <div className="mt-2 text-sm font-semibold">{b.customerName}</div>
                          <div className="text-xs text-slate-500">Phone: {b.phone}</div>
                        </div>

                        <div className="flex flex-col gap-3 sm:items-end">
                          {!isFinal(b) && (
                            <PaymentProofUploader
                              bookingId={b.id}
                              phone={b.phone}
                              paymentStatus={b.paymentStatus}
                              paymentProof={b.paymentProof || null}
                              onUploaded={isAccount ? loadAccount : loadGuest}
                            />
                          )}

                          {!isFinal(b) && (
                            <button
                              onClick={() => setConfirmId(b.id)}
                              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              <Trash2 size={16} />
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CONFIRM MODAL */}
      {confirmId !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
            <div className="text-lg font-extrabold">Are you confirm?</div>
            <p className="mt-1 text-sm text-slate-600">This booking will be cancelled.</p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmId(null)}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                No
              </button>
              <button
                onClick={confirmCancel}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
