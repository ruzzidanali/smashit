import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listBusinesses, listStates, listCities, type PublicBusiness } from "../services/api";

export default function DiscoverPage() {
  const nav = useNavigate();

  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  const [state, setState] = useState("");
  const [city, setCity] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<PublicBusiness[]>([]);

  async function loadStateOptions() {
    setLoadingStates(true);
    try {
      const s = await listStates();
      setStates(s);
    } finally {
      setLoadingStates(false);
    }
  }

  async function loadCityOptions(selectedState: string) {
    setLoadingCities(true);
    try {
      const c = await listCities(selectedState);
      setCities(c);
    } finally {
      setLoadingCities(false);
    }
  }

  async function search() {
    setErr(null);
    setLoading(true);
    try {
      const data = await listBusinesses(state || undefined, city || undefined);
      setItems(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load businesses";
      setErr(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  // initial load
  useEffect(() => {
    loadStateOptions();
    search(); // show all first
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when state changes → refresh cities
  useEffect(() => {
    setCity("");
    setCities([]);
    if (!state) return;
    loadCityOptions(state);
  }, [state]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="font-outfit text-2xl font-extrabold text-slate-900 md:text-3xl">
          Find badminton courts
        </h1>
        <p className="mt-1 text-slate-600">
          Filter by state/city, then open a business booking page.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {/* State */}
          <div>
            <label className="text-xs font-semibold text-slate-600">State</label>
            <div className="mt-2 relative">
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option value="">All states</option>
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {loadingStates && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  loading…
                </div>
              )}
            </div>
          </div>

          {/* City */}
          <div>
            <label className="text-xs font-semibold text-slate-600">City</label>
            <div className="mt-2 relative">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!state}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none disabled:bg-slate-50 focus:ring-2 focus:ring-emerald-200"
              >
                <option value="">{state ? "All cities" : "Select state first"}</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {loadingCities && state && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  loading…
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="md:self-end">
            <button
              onClick={search}
              className="h-10 w-full rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Search
            </button>
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {err}
          </div>
        )}
      </div>

      {/* Results (keep your existing results UI) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between px-2 pb-3">
          <div>
            <div className="font-outfit text-lg font-extrabold text-slate-900">Results</div>
            <div className="text-sm text-slate-500">Click a business to book courts & time slots</div>
          </div>
          {loading && <div className="text-sm text-slate-500">Loading…</div>}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {items.map((b) => (
            <button
              key={b.id}
              onClick={() => nav(`/b/${b.slug}`)}
              className="text-left rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition"
            >
              <div className="text-sm font-extrabold text-slate-900">{b.name}</div>
              <div className="mt-1 text-xs text-slate-600">
                {(b.state || "—")}{b.city ? `, ${b.city}` : ""}
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono">{b.slug}</div>
              <div className="mt-1 text-xs text-slate-500 font-mono">{b.phone}</div>
            </button>
          ))}

          {!loading && items.length === 0 && (
            <div className="col-span-full rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              No businesses found for that filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
