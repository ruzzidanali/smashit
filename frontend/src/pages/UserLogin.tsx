import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { userLogin } from "../services/api";
import { useAuth } from "../context/useAuth";

interface LocationState {
  from?: string;
}

export default function UserLogin() {
  const nav = useNavigate();
  const loc = useLocation();

  const { account, loading: authLoading, refresh } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectTo = (loc.state as LocationState)?.from || "/";

  // ✅ If already logged in (and verified), don’t allow visiting /login
  useEffect(() => {
    if (authLoading) return; // wait until AuthProvider finishes refresh()
    if (account && account.isEmailVerified) {
      nav("/profile", { replace: true });
    }
  }, [account, authLoading, nav]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const r = await userLogin(email, password);

      localStorage.setItem("smashit_user_token", r.token);
      await refresh(); // keep navbar + guards in sync

      nav(redirectTo, { replace: true });
    } catch (e: unknown) {
      const err = e as { code?: string; error?: string; email?: string };

      if (err.code === "EMAIL_NOT_VERIFIED") {
        nav("/verify-email", {
          replace: true,
          state: { email: err.email || email.trim(), from: redirectTo },
        });
        setLoading(false);
        return;
      }

      if (err.code === "TAC_EXPIRED") {
        nav("/verify-email", {
          replace: true,
          state: { email: err.email || email.trim(), reason: "TAC_EXPIRED" },
        });
        setLoading(false);
        return;
      }

      setErr(err.error || "Login failed");
      setLoading(false);
    }
  }

  // optional: prevent flicker while auth state is loading
  if (authLoading) return null;

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-outfit font-bold text-slate-900">Login</h1>
        <p className="text-sm text-slate-500 mt-1">
          Book courts faster with your account.
        </p>

        {err && (
          <div className="mt-4 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">
            {err}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-sm font-semibold text-slate-700">Email</label>
            <input
              className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-green-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              type="email"
              required
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
              required
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
          <Link className="text-green-700 font-semibold hover:underline" to="/register">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
