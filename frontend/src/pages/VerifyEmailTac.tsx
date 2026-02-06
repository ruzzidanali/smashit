import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { resendAccountTac, verifyAccountEmail } from "../services/api";
import { useAuth } from "../context/useAuth";

type LocationState = {
  email?: string;
  from?: string;
  reason?: string;
};

export default function VerifyEmailTac() {
  const nav = useNavigate();
  const loc = useLocation();
  const { refresh } = useAuth();

  const state = (loc.state as LocationState | null) || null;

  const defaultEmail = state?.email || "";
  const from = state?.from || "/profile";

  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const canSubmit = useMemo(() => {
    return !!email.trim() && !!code.trim() && !loading;
  }, [email, code, loading]);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setLoading(true);

    try {
      const r = await verifyAccountEmail(email.trim(), code.trim());
      setOk(r.message || "Verified!");

      if (r.token) {
        localStorage.setItem("smashit_user_token", r.token);
        await refresh();
        window.dispatchEvent(new Event("smashit-auth-changed"));
        nav(from, { replace: true });
        return;
      }

      // fallback
      nav("/login", { replace: true, state: { from } });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setErr(null);
    setOk(null);
    setResending(true);
    try {
      const r = await resendAccountTac(email.trim());
      setOk(r.message || "TAC resent.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Resend failed");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-outfit font-bold text-slate-900">
          Verify Email
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Enter the TAC code sent to your email.
        </p>

        {err && (
          <div className="mt-4 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">
            {err}
          </div>
        )}
        {ok && (
          <div className="mt-4 rounded-xl bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">
            {ok}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={onVerify}>
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
            <label className="text-sm font-semibold text-slate-700">TAC Code</label>
            <input
              className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-green-200"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
              inputMode="numeric"
              required
            />
          </div>

          <button
            disabled={!canSubmit}
            className="w-full h-11 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            onClick={onResend}
            disabled={resending || !email.trim()}
            className="text-green-700 font-semibold hover:underline disabled:opacity-60"
          >
            {resending ? "Resending..." : "Resend TAC"}
          </button>

          <Link className="text-slate-600 hover:underline" to="/login" state={{ from }}>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
