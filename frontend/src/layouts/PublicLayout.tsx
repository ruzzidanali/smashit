import React from "react";
import { NavLink, Outlet } from "react-router-dom";

function cx(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

export default function PublicLayout() {
  const token = localStorage.getItem("smashit_owner_token");
  const adminHref = token ? "/owner/dashboard" : "/owner/login";

  const navBase = "text-sm font-semibold px-3 py-2 rounded-xl transition";
  const active = "text-slate-900 bg-slate-100";
  const inactive = "text-slate-600 hover:text-slate-900 hover:bg-slate-50";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-green-600 text-white grid place-items-center font-extrabold">
              S
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-900">SmashIt</div>
              <div className="text-xs text-slate-500">Premium badminton court reservations</div>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            <NavLink to="/reserve" className={({ isActive }) => cx(navBase, isActive ? active : inactive)}>
              Reserve
            </NavLink>
            <NavLink to="/my-bookings" className={({ isActive }) => cx(navBase, isActive ? active : inactive)}>
              My Bookings
            </NavLink>
            <NavLink to="/ai" className={({ isActive }) => cx(navBase, isActive ? active : inactive)}>
              AI Assistant
            </NavLink>

            <a
              href={`#${adminHref}`}
              className="ml-2 h-9 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center"
            >
              Admin
            </a>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-6 w-full flex-1">
        <Outlet />
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-slate-600">
            © {new Date().getFullYear()} <span className="font-semibold text-slate-900">SmashIt</span> — Premium badminton court reservations.
          </div>
          <div className="text-sm text-slate-600 flex items-center gap-4">
            <span className="text-slate-400">•</span>
            <span>Support</span>
            <span className="text-slate-400">•</span>
            <span>Terms</span>
            <span className="text-slate-400">•</span>
            <span>Privacy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
