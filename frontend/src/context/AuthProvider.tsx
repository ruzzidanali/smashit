import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import { accountMe } from "../services/api";
import type { AccountMe } from "../services/api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<AccountMe | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const token = localStorage.getItem("smashit_user_token");
    if (!token) {
      setAccount(null);
      setLoading(false);
      return;
    }

    try {
      const r = await accountMe();
      setAccount(r.account);
    } catch (e: unknown) {
      const status = (e instanceof Error && "status" in e) ? (e as { status: number }).status : undefined;
      if (status === 401 || status === 403) {
        localStorage.removeItem("smashit_user_token");
        setAccount(null);
        window.dispatchEvent(new Event("smashit-auth-changed"));
      }
      // else: keep token (network error / 500 / backend restart)
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("smashit_user_token");
    setAccount(null);
    window.dispatchEvent(new Event("smashit-auth-changed"));
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AuthContext.Provider value={{ account, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
