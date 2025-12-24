import React from "react";
import { Navigate } from "react-router-dom";

export default function OwnerGuard({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("smashit_owner_token");
  if (!token) return <Navigate to="/owner/login" replace />;
  return <>{children}</>;
}
