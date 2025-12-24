import React, { useEffect, useState } from "react";
import { adminGetBusiness, adminGetCourts } from "../services/adminApi";
import { Link } from "react-router-dom";

export default function OwnerDashboard() {
  const [biz, setBiz] = useState<{ id: number; name: string; slug: string } | null>(null);
  const [courtsCount, setCourtsCount] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const b = await adminGetBusiness();
        setBiz({ id: b.id, name: b.name, slug: b.slug });
        const courts = await adminGetCourts();
        setCourtsCount(courts.length);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to load dashboard";
        setErr(message);
      }
    })();
  }, []);

  // function logout() {
  //   localStorage.removeItem("smashit_owner_token");
  //   localStorage.removeItem("smashit_owner_business");
  //   location.hash = "#/owner/login";
  // }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-outfit font-bold text-slate-900">Owner Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Your business overview.</p>
          </div>
          {/* <button onClick={logout} className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            Logout
          </button> */}
        </div>

        {err && <div className="mt-4 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{err}</div>}

        {biz && (
          <div className="mt-5 grid sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-500">Business</div>
              <div className="mt-1 text-base font-bold text-slate-900">{biz.name}</div>
              <div className="mt-1 text-xs text-slate-500">slug: {biz.slug}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-500">Courts</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900">{courtsCount}</div>
              <Link className="text-sm font-semibold text-green-700 hover:underline" to="/owner/courts">
                Manage courts →
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-500">Public booking link</div>
              <div className="mt-2 text-sm text-slate-700 break-all">
                #{`/b/${biz.slug}`}
              </div>
              <Link className="text-sm font-semibold text-green-700 hover:underline" to={`/b/${biz.slug}`}>
                Open customer page →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
