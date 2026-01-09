import { useCallback, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getBusinessProfile } from "../services/api";

interface BusinessProfile {
  address?: string | null;
  state?: string | null;
  city?: string | null;
  postcode?: string | null;
  phone?: string | null;
  isProfileComplete?: boolean;
}

function computeComplete(biz: BusinessProfile) {
  const completeByFields =
    !!biz?.address && !!biz?.state && !!biz?.city && !!biz?.postcode && !!biz?.phone;

  return Boolean(biz?.isProfileComplete) || completeByFields;
}

export default function ProfileGuard({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const [loading, setLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const raw = localStorage.getItem("smashit_owner_business");
      if (raw) {
        const cached = JSON.parse(raw);
        if (computeComplete(cached)) {
          setIsComplete(true);
          setLoading(false);
          return;
        }
      }

      const biz = await getBusinessProfile();
      localStorage.setItem("smashit_owner_business", JSON.stringify(biz));
      setIsComplete(computeComplete(biz));
    } catch {
      setIsComplete(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check, loc.pathname]);

  useEffect(() => {
    const onUpdated = () => check();
    window.addEventListener("smashit:business-updated", onUpdated);
    return () => window.removeEventListener("smashit:business-updated", onUpdated);
  }, [check]);

  if (loc.pathname.includes("/owner/profile")) {
    return <>{children}</>;
  }

  if (loading) return null;

  if (!isComplete) {
    return <Navigate to="/owner/profile" replace />;
  }

  return <>{children}</>;
}
