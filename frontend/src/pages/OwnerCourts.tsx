import React, { useEffect, useState } from "react";
import type { AdminCourt } from "../services/adminApi";
import { adminCreateCourt, adminGetCourts, adminUpdateCourt } from "../services/adminApi";

export default function OwnerCourts() {
  const [courts, setCourts] = useState<AdminCourt[]>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const data = await adminGetCourts();
    setCourts(data);
  }

  useEffect(() => {
    refresh().catch((e) => setErr(e.message));
  }, []);

  async function addCourt() {
    if (!name.trim()) return;
    setErr(null);
    setBusy(true);
    try {
      await adminCreateCourt(name.trim());
      setName("");
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(c: AdminCourt) {
    setErr(null);
    try {
      await adminUpdateCourt(c.id, { isActive: !c.isActive });
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-outfit font-bold text-slate-900">Courts</h1>
        <p className="text-sm text-slate-500 mt-1">Add / activate / deactivate courts.</p>

        {err && <div className="mt-4 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{err}</div>}

        <div className="mt-5 flex gap-3">
          <input
            className="flex-1 h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-green-200"
            placeholder="Court name (e.g. Court A)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            disabled={busy}
            onClick={addCourt}
            className="h-11 px-4 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
          >
            Add
          </button>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {courts.map((c) => (
            <div key={c.id} className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">{c.name}</div>
                <div className="text-xs text-slate-500 mt-1">{c.isActive ? "Active" : "Inactive"}</div>
              </div>

              <button
                onClick={() => toggleActive(c)}
                className={`h-9 px-3 rounded-xl text-sm font-semibold border ${
                  c.isActive
                    ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                    : "border-green-200 text-green-700 hover:bg-green-50"
                }`}
              >
                {c.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
