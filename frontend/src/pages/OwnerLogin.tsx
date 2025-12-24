import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ownerLogin } from "../services/adminApi";

export default function OwnerLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await ownerLogin({ email, password });
      localStorage.setItem("smashit_owner_token", r.token);
      localStorage.setItem("smashit_owner_business", JSON.stringify(r.business));
      nav("/owner/dashboard");
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Login failed";
      setErr(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-outfit font-bold text-slate-900">Owner Login</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your courts & bookings.</p>

        {err && <div className="mt-4 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{err}</div>}

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-sm font-semibold text-slate-700">Email</label>
            <input
              className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-green-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <input
              type="password"
              className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-green-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            disabled={loading}
            className="w-full h-11 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="mt-4 text-sm text-slate-600">
          No account?{" "}
          <Link className="text-green-700 font-semibold hover:underline" to="/owner/register">
            Register business
          </Link>
        </div>
      </div>
    </div>
  );
}
