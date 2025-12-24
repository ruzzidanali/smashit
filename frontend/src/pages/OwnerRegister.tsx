import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ownerRegister } from "../services/adminApi";

export default function OwnerRegister() {
  const nav = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await ownerRegister({ businessName, email, password });
      localStorage.setItem("smashit_owner_token", r.token);
      localStorage.setItem("smashit_owner_business", JSON.stringify(r.business));
      nav("/owner/dashboard");
    } catch (e: Error | unknown) {
      setErr(e instanceof Error ? e.message : "Register failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-outfit font-bold text-slate-900">Register Your Business</h1>
        <p className="text-sm text-slate-500 mt-1">Create your owner account.</p>

        {err && <div className="mt-4 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{err}</div>}

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-sm font-semibold text-slate-700">Business name</label>
            <input
              className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-green-200"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>

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
            <label className="text-sm font-semibold text-slate-700">Password (min 6)</label>
            <input
              type="password"
              className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-green-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button
            disabled={loading}
            className="w-full h-11 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Business"}
          </button>
        </form>

        <div className="mt-4 text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="text-green-700 font-semibold hover:underline" to="/owner/login">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
