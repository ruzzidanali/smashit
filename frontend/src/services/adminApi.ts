import { API_BASE, authHeader } from "../config";

async function json<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

function getAuthHeaders(): Record<string, string> {
  const headers = authHeader();
  if (!headers || !headers.Authorization) {
    return {};
  }
  return headers as Record<string, string>;
}

export type OwnerAuthResponse = {
  token: string;
  business: { id: number; name: string; slug: string };
  user: { id: number; email: string; role: string };
};

export async function ownerRegister(payload: {
  businessName: string;
  email: string;
  password: string;
}) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return json<OwnerAuthResponse>(res);
}

export async function ownerLogin(payload: { email: string; password: string }) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return json<OwnerAuthResponse>(res);
}

export async function adminGetBusiness() {
  const res = await fetch(`${API_BASE}/api/admin/business`, {
    headers: getAuthHeaders(),
  });
  return json<{ id: number; name: string; slug: string; createdAt: string }>(
    res
  );
}

export type AdminCourt = {
  id: number;
  name: string;
  isActive: boolean;
  businessId: number;
  createdAt: string;
};

export async function adminGetCourts() {
  const res = await fetch(`${API_BASE}/api/admin/courts`, {
    headers: getAuthHeaders(),
  });
  return json<AdminCourt[]>(res);
}

export async function adminCreateCourt(name: string) {
  const res = await fetch(`${API_BASE}/api/admin/courts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ name }),
  });
  return json<AdminCourt>(res);
}

export async function adminUpdateCourt(
  id: number,
  patch: { name?: string; isActive?: boolean }
) {
  const res = await fetch(`${API_BASE}/api/admin/courts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(patch),
  });
  return json<AdminCourt>(res);
}

export type AdminBooking = {
  id: number;
  courtId: number;
  businessId: number;
  date: string;
  startMinutes: number;
  endMinutes: number;
  customerName: string;
  phone: string;
  status: string;
  createdAt: string;
  court: {
    id: number;
    name: string;
    isActive: boolean;
    businessId: number;
    createdAt: string;
  };
};

export async function adminGetBookings(date: string) {
  const res = await fetch(
    `${API_BASE}/api/admin/bookings?date=${encodeURIComponent(date)}`,
    {
      headers: getAuthHeaders(),
    }
  );
  return json<AdminBooking[]>(res);
}

export async function adminCancelBooking(id: number) {
  const res = await fetch(`${API_BASE}/api/admin/bookings/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return json<{ success: true }>(res);
}
