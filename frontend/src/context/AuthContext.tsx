import { createContext } from "react";
import type { AccountMe } from "../services/api";

export type AuthState = {
  account: AccountMe | null;
  loading: boolean;
  logout: () => void;
  refresh: () => Promise<void>;
};

export const AuthContext = createContext<AuthState | null>(null);
