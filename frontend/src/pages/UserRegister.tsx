import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  accountRegister,
  resendAccountTac,
  verifyAccountEmail,
} from "../services/api";
import { useAuth } from "../context/useAuth";

type Step = "register" | "verify";

export default function UserRegister() {
  const nav = useNavigate();
  const { refresh } = useAuth();

  const [step, setStep] = useState<Step>("register");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [code, setCode] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("smashit_user_token");
    if (token) nav("/", { replace: true });
  }, [nav]);

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (password.length < 6) {
      setErr("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const r = await accountRegister({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
      });

      setOk(r.message || "TAC sent to your email.");
      setStep("verify");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Register failed");
    } finally {
      setLoading(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    setLoading(true);
    try {
      const r = await verifyAccountEmail(email.trim(), code.trim());
      setOk(r.message || "Verified!");

      // ✅ if backend returns token, auto-login
      if (r.token) {
        localStorage.setItem("smashit_user_token", r.token);
        await refresh();
        window.dispatchEvent(new Event("smashit-auth-changed"));
        nav("/profile", { replace: true });
        return;
      }

      // fallback
      nav("/login", { replace: true });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setErr(null);
    setOk(null);

    setLoading(true);
    try {
      const r = await resendAccountTac(email.trim());
      setOk(r.message || "New TAC sent.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to resend TAC");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-outfit font-bold text-slate-900">
          {step === "register" ? "Create Account" : "Verify Email"}
        </h1>

        <p className="text-sm text-slate-500 mt-1">
          {step === "register"
            ? "Register with your details. We’ll send a TAC to your email."
            : `Enter the TAC sent to ${email || "your email"}.`}
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

        {step === "register" ? (
          <form className="mt-6 space-y-4" onSubmit={onRegister}>
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Name
              </label>
              <input
                className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-green-200"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Phone
              </label>
              <input
                className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-green-200"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Email
              </label>
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
              <label className="text-sm font-semibold text-slate-700">
                Password
              </label>
              <input
                type="password"
                className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-green-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>

            <button
              disabled={loading}
              className="w-full h-11 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
            >
              {loading ? "Sending TAC..." : "Register"}
            </button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onVerify}>
            <div>
              <label className="text-sm font-semibold text-slate-700">
                TAC Code
              </label>
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
              disabled={loading}
              className="w-full h-11 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify Email"}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={onResend}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Resend TAC
            </button>

            <div className="text-sm text-slate-600">
              Wrong email?{" "}
              <button
                type="button"
                onClick={() => {
                  setStep("register");
                  setCode("");
                  setErr(null);
                  setOk(null);
                }}
                className="text-green-700 font-semibold hover:underline"
              >
                Go back
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            className="text-green-700 font-semibold hover:underline"
            to="/login"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
