import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  accountMe,
  changeAccountPassword,
  updateAccountMe,
} from "../services/api";

export default function UserProfile() {
  const nav = useNavigate();
  const loc = useLocation();

  const from = useMemo(() => loc.pathname + loc.search, [loc.pathname, loc.search]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isVerified, setIsVerified] = useState<boolean>(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("smashit_user_token");
    if (!token) {
      nav("/login", { replace: true });
      return;
    }

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await accountMe();
        setEmail(r.account.email);
        setName(r.account.name);
        setPhone(r.account.phone);
        setIsVerified(r.account.isEmailVerified);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [nav, from]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setSaving(true);

    try {
      const r = await updateAccountMe({
        email: email.trim(),
        name: name.trim(),
        phone: phone.trim(),
      });

      setEmail(r.account.email);
      setName(r.account.name);
      setPhone(r.account.phone);
      setIsVerified(r.account.isEmailVerified);

      if (!r.account.isEmailVerified) {
        setOk("Profile updated. Please verify your email (TAC sent).");
      } else {
        setOk("Profile updated.");
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (newPassword.length < 6) {
      setErr("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErr("New passwords do not match");
      return;
    }

    setChangingPw(true);
    try {
      const r = await changeAccountPassword({
        currentPassword,
        newPassword,
      });

      setOk(r.message || "Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setChangingPw(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="text-sm text-slate-600">Loading profile…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto grid gap-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-outfit font-bold text-slate-900">
          My Profile
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your account details.
        </p>

        {!isVerified && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="font-semibold">Your email is not verified.</div>
            <div className="mt-1 text-amber-800">
              Please verify to continue using all features.
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() =>
                  nav("/verify-email", {
                    replace: true,
                    state: { email: email.trim(), from },
                  })
                }
                className="h-9 px-3 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700"
              >
                Verify now
              </button>

              <button
                onClick={() => window.location.reload()}
                className="h-9 px-3 rounded-xl border border-amber-200 bg-white text-sm font-semibold text-amber-900 hover:bg-amber-100"
              >
                Refresh
              </button>
            </div>
          </div>
        )}

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

        <form className="mt-6 space-y-4" onSubmit={saveProfile}>
          <div>
            <label className="text-sm font-semibold text-slate-700">Name</label>
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

          <button
            disabled={saving}
            className="w-full h-11 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-outfit font-bold text-slate-900">
          Change Password
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Update your password anytime.
        </p>

        <form className="mt-6 space-y-4" onSubmit={updatePassword}>
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Current password
            </label>
            <input
              type="password"
              className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-green-200"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              New password
            </label>
            <input
              type="password"
              className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-green-200"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Confirm new password
            </label>
            <input
              type="password"
              className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-green-200"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>

          <button
            disabled={changingPw}
            className="w-full h-11 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60"
          >
            {changingPw ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
