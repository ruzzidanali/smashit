import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

interface LocationState {
    from?: string;
}

export default function GuestGuard({ children }: { children: React.ReactNode }) {
    const { account, loading } = useAuth();
    const loc = useLocation();

    if (loading) return null;

    if (account) {
        const from = (loc.state as LocationState)?.from;
        return <Navigate to={from || "/profile"} replace />;
    }

    return <>{children}</>
}