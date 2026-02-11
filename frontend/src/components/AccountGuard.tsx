import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function AccountGuard({ children }: { children: React.ReactNode }) {
  const { account, loading } = useAuth();
  const loc = useLocation();

  const from = loc.pathname + loc.search;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="text-sm text-slate-600">Checking session…</div>
        </div>
      </div>
    );
  }

  if (!account) {
    return <Navigate to="/login" replace state={{ from }} />;
  }

  if (account.isEmailVerified === false) {
    return (
      <Navigate
        to="/verify-email"
        replace
        state={{ email: account.email, reason: "NOT_VERIFIED", from }}
      />
    );
  }

  return <>{children}</>;
}
