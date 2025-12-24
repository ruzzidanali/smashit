import { useMemo } from "react";
import type { Court } from "../types";
import { fmtMinutes } from "../utils/time";

type BookingLite = { id: number; courtId: number; startMinutes: number; endMinutes: number };

type Props = {
  date: string; // YYYY-MM-DD
  courts: Court[];
  bookings: BookingLite[];
  onPick: (courtId: number, slot: { startMinutes: number; endMinutes: number }) => void;
};

const OPEN_MIN = 8 * 60;   // 08:00
const CLOSE_MIN = 23 * 60; // 23:00
const SLOT_MIN = 60;       // 60-min slots

function makeSlots() {
  const slots: { startMinutes: number; endMinutes: number }[] = [];
  for (let s = OPEN_MIN; s + SLOT_MIN <= CLOSE_MIN; s += SLOT_MIN) {
    slots.push({ startMinutes: s, endMinutes: s + SLOT_MIN });
  }
  return slots;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

function todayYYYYMMDD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nowMinutesLocal() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export default function CourtGrid({ date, courts, bookings, onPick }: Props) {
  const slots = useMemo(() => makeSlots(), []);
  const today = todayYYYYMMDD();
  const isToday = date === today;
  const isPastDate = date < today;
  const nowMin = isToday ? nowMinutesLocal() : -1;

  const byCourt = useMemo(() => {
    const m = new Map<number, BookingLite[]>();
    for (const b of bookings) {
      const arr = m.get(b.courtId) || [];
      arr.push(b);
      m.set(b.courtId, arr);
    }
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => a.startMinutes - b.startMinutes);
      m.set(k, arr);
    }
    return m;
  }, [bookings]);

  return (
    <div className="grid gap-4">
      {courts.map((court) => {
        const booked = byCourt.get(court.id) || [];

        return (
          <div key={court.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-outfit text-base font-extrabold text-slate-900">{court.name}</div>
                <div className="text-xs text-slate-500">
                  {slots.length} fixed time slots{isToday ? " · past times disabled" : ""}
                </div>
              </div>
              <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                Court ID: {court.id}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {slots.map((slot) => {
                const isTaken = booked.some((b) =>
                  overlaps(slot.startMinutes, slot.endMinutes, b.startMinutes, b.endMinutes)
                );

                const isPast = isToday && slot.startMinutes <= nowMin;
                const disabled = isTaken || isPast || isPastDate;

                const title = isTaken ? "Booked" : isPastDate ? "Past date not allowed" : isPast ? "Time already passed" : "Available";

                return (
                  <button
                    key={slot.startMinutes}
                    disabled={disabled}
                    onClick={() => onPick(court.id, slot)}
                    className={[
                      "rounded-xl px-3 py-2 text-left text-sm font-semibold transition ring-1",
                      disabled
                        ? "cursor-not-allowed bg-slate-50 text-slate-400 ring-slate-200"
                        : "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100",
                    ].join(" ")}
                    title={title}
                  >
                    <div>{fmtMinutes(slot.startMinutes)}</div>
                    <div className="text-xs font-medium opacity-80">to {fmtMinutes(slot.endMinutes)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
