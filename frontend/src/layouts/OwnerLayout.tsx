import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

function cx(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

export default function OwnerLayout() {
  const nav = useNavigate();

  function logout() {
    localStorage.removeItem("smashit_owner_token");
    localStorage.removeItem("smashit_owner_business");
    nav("/owner/login", { replace: true });
  }

  const linkBase =
    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition border";
  const linkInactive =
    "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50";
  const linkActive = "border-slate-200 bg-white text-slate-900 shadow-sm";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-green-600 text-white grid place-items-center font-extrabold">
              S
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-900">
                SmashIt Owner
              </div>
              <div className="text-xs text-slate-500">
                Manage courts & bookings
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="h-9 px-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-4 py-6 grid md:grid-cols-[240px_1fr] gap-6 w-full flex-1">
        {/* Sidebar */}
        <aside className="md:sticky md:top-[76px] h-fit">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <nav className="space-y-1">
              <NavLink
                to="/owner/dashboard"
                className={({ isActive }) =>
                  cx(linkBase, isActive ? linkActive : linkInactive)
                }
              >
                Dashboard
              </NavLink>

              <NavLink
                to="/owner/courts"
                className={({ isActive }) =>
                  cx(linkBase, isActive ? linkActive : linkInactive)
                }
              >
                Courts
              </NavLink>

              <NavLink
                to="/owner/bookings"
                className={({ isActive }) =>
                  cx(linkBase, isActive ? linkActive : linkInactive)
                }
              >
                Bookings
              </NavLink>

              <NavLink
                to="/owner/profile"
                className={({ isActive }) =>
                  cx(linkBase, isActive ? linkActive : linkInactive)
                }
              >
                Profile
              </NavLink>

              {/* Later */}
              <div className="pt-2 mt-2 border-t border-slate-100">
                <div className="px-2 text-xs font-semibold text-slate-400">
                  Coming Soon
                </div>
                <div className="mt-1 px-2 text-sm text-slate-500">
                  Payments • Profile • Staff
                </div>
              </div>
            </nav>
          </div>
        </aside>

        {/*Main Content */}
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>

      {/* OWNER FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-slate-600">
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold text-slate-900">SmashIt</span> —
            Owner dashboard
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
