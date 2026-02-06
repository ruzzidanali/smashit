import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../context/useAuth";

function cx(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

export default function PublicLayout() {
  const nav = useNavigate();
  const loc = useLocation();

  const { account, loading, logout, refresh } = useAuth();

  const [ownerToken, setOwnerToken] = useState(() =>
    localStorage.getItem("smashit_owner_token"),
  );

  useEffect(() => {
    function syncOwner() {
      setOwnerToken(localStorage.getItem("smashit_owner_token"));
    }

    refresh();
    syncOwner();

    // optional: keep UI correct when user comes back to tab
    window.addEventListener("smashit-auth-changed", refresh);
    window.addEventListener("smashit-auth-changed", syncOwner);

    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("focus", syncOwner);
    };
  }, [refresh]);

  const adminHref = ownerToken ? "/owner/dashboard" : "/owner/login";

  function logoutUser() {
    logout();

    // keep SPA navigation + route state
    const next = loc.pathname === "/profile" ? "/" : loc.pathname;
    nav(next, { replace: true });
  }

  const navBase = "text-sm font-semibold px-3 py-2 rounded-xl transition";
  const active = "text-slate-900 bg-slate-100";
  const inactive = "text-slate-600 hover:text-slate-900 hover:bg-slate-50";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-green-600 text-white grid place-items-center font-extrabold">
              S
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-900">
                SmashIt
              </div>
              <div className="text-xs text-slate-500">
                Premium badminton court reservations
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink
              to="/reserve"
              className={({ isActive }) =>
                cx(navBase, isActive ? active : inactive)
              }
            >
              Reserve
            </NavLink>

            <NavLink
              to="/my-bookings"
              className={({ isActive }) =>
                cx(navBase, isActive ? active : inactive)
              }
            >
              My Bookings
            </NavLink>

            {!loading && !account ? (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    cx(navBase, isActive ? active : inactive)
                  }
                >
                  Login
                </NavLink>

                <Link
                  to="/register"
                  className="ml-1 h-9 px-3 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 flex items-center"
                >
                  Register
                </Link>
              </>
            ) : !loading && account ? (
              <>
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    cx(navBase, isActive ? active : inactive)
                  }
                >
                  Profile
                </NavLink>

                <button
                  onClick={logoutUser}
                  className="ml-1 h-9 px-3 rounded-xl bg-slate-100 text-slate-800 text-sm font-semibold hover:bg-slate-200 flex items-center"
                >
                  Logout
                </button>
              </>
            ) : null}

            <Link
              to={adminHref}
              className="ml-2 h-9 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center"
            >
              Admin
            </Link>
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
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold text-slate-900">SmashIt</span> —
            Premium badminton court reservations.
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
