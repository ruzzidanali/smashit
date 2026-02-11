// src/services/api.ts
import { API_BASE_URL } from "../config";
import type { Booking, Court, AvailabilityResponse } from "../types";
import { throwIfNotOk, parseJsonOrNull } from "./http";

/* ---------------- types ---------------- */

export type OwnerBusiness = {
  id: number;
  name: string;
  slug: string;
  address?: string | null;
  state?: string | null;
  city?: string | null;
  postcode?: string | null;
  phone?: string | null;
  openMinutes?: number | null;
  closeMinutes?: number | null;
  slotMinutes?: number | null;
  priceCents?: number | null;
  createdAt?: string;
  isProfileComplete?: boolean;
};

export type CreateBookingPayload = {
  courtId: number;
  date: string;
  startMinutes: number;
  endMinutes: number;
  customerName: string;
  phone: string;
};

export type AccountMe = {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: "USER" | "OWNER" | "ADMIN";
  isEmailVerified: boolean;
  createdAt?: string;
};

/* ---------------- token helpers ---------------- */

function getOwnerToken() {
  return localStorage.getItem("smashit_owner_token") || "";
}

function getUserToken() {
  return localStorage.getItem("smashit_user_token") || "";
}

function userAuthHeader(): Record<string, string> {
  const token = getUserToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ---------------- account (customer) ---------------- */

export async function accountMe(): Promise<{ account: AccountMe }> {
  const token = getUserToken();
  const res = await fetch(`${API_BASE_URL}/api/account/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    let data: Record<string, unknown> | null = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // ignore
    }

    throw {
      status: res.status,
      message:
        (data as Record<string, unknown> | null)?.error ||
        `Request failed (${res.status})`,
      code: (data as Record<string, unknown> | null)?.code,
    };
  }

  return (await res.json()) as { account: AccountMe };
}


export async function accountRegister(payload: {
  name: string;
  phone: string;
  email: string;
  password: string;
}): Promise<{
  ok: true;
  message: string;
  pending?: { email: string; name: string; phone: string; expiresAt: string };
  devTac?: string;
}> {
  const res = await fetch(`${API_BASE_URL}/api/account/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as {
    ok: true;
    message: string;
    pending?: { email: string; name: string; phone: string; expiresAt: string };
    devTac?: string;
  };
}

export async function userLogin(email: string, password: string): Promise<{
  token: string;
  account: {
    id: number;
    email: string;
    role: string;
    name: string;
    phone: string;
    createdAt: string;
    isEmailVerified: boolean;
  };
}> {
  const res = await fetch(`${API_BASE_URL}/api/account/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as {
    token: string;
    account: {
      id: number;
      email: string;
      role: string;
      name: string;
      phone: string;
      createdAt: string;
      isEmailVerified: boolean;
    };
  };
}

export async function verifyAccountEmail(email: string, code: string): Promise<{
  ok: true;
  message: string;
  token?: string;
  account?: AccountMe;
}> {
  const res = await fetch(`${API_BASE_URL}/api/account/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });

  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as { ok: true; message: string; token?: string; account?: AccountMe };
}

export async function resendAccountTac(email: string): Promise<{
  ok: true;
  message: string;
  devTac?: string;
}> {
  const res = await fetch(`${API_BASE_URL}/api/account/resend-tac`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as { ok: true; message: string; devTac?: string };
}

export async function updateAccountMe(payload: {
  email?: string;
  name?: string;
  phone?: string;
}): Promise<{ ok: true; account: AccountMe }> {
  const res = await fetch(`${API_BASE_URL}/api/account/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...userAuthHeader(),
    },
    body: JSON.stringify(payload),
  });

  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as { ok: true; account: AccountMe };
}

export async function changeAccountPassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: true; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/account/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...userAuthHeader(),
    },
    body: JSON.stringify(payload),
  });

  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as { ok: true; message: string };
}

/* ---------------- owner (admin per business) ---------------- */

export async function getBusinessProfile(): Promise<OwnerBusiness> {
  const token = getOwnerToken();
  const res = await fetch(`${API_BASE_URL}/api/admin/business/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as OwnerBusiness;
}

export async function updateBusinessProfile(
  payload: Partial<OwnerBusiness>
): Promise<OwnerBusiness> {
  const token = getOwnerToken();
  const res = await fetch(`${API_BASE_URL}/api/admin/business/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as OwnerBusiness;
}

/* ---------------- public (discover / browse) ---------------- */

export async function listStates(): Promise<string[]> {
  const res = await fetch(`${API_BASE_URL}/api/public/locations/states`);
  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as string[];
}

export async function listCities(state: string): Promise<string[]> {
  const qs = new URLSearchParams({ state });
  const res = await fetch(
    `${API_BASE_URL}/api/public/locations/cities?${qs.toString()}`
  );
  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as string[];
}

export type PublicBusiness = {
  id: number;
  name: string;
  slug: string;
  state?: string | null;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
};

export async function listBusinesses(
  state?: string,
  city?: string
): Promise<PublicBusiness[]> {
  const qs = new URLSearchParams();
  if (state) qs.set("state", state);
  if (city) qs.set("city", city);

  const url =
    `${API_BASE_URL}/api/public/businesses` +
    (qs.toString() ? `?${qs.toString()}` : "");

  const res = await fetch(url);
  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as PublicBusiness[];
}

/* ---------------- booking / courts (public by slug) ---------------- */

type CourtsResponse = {
  business: {
    id: number;
    name: string;
    slug: string;
    openMinutes: number;
    closeMinutes: number;
    slotMinutes: number;
    priceCents: number;
  };
  courts: Court[];
};

export async function getCourts(slug: string): Promise<CourtsResponse> {
  const res = await fetch(`${API_BASE_URL}/api/b/${encodeURIComponent(slug)}/courts`);
  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as CourtsResponse;
}

export async function getAvailability(
  slug: string,
  date: string
): Promise<AvailabilityResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/b/${encodeURIComponent(slug)}/availability?date=${encodeURIComponent(
      date
    )}`
  );
  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as AvailabilityResponse;
}

export async function createBooking(slug: string, payload: CreateBookingPayload) {
  const token = getUserToken();

  const res = await fetch(`${API_BASE_URL}/api/b/${encodeURIComponent(slug)}/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  // Keep special message for conflicts:
  if (res.status === 409) {
    const data = await parseJsonOrNull(res);
    throw { code: "CONFLICT", error: (data as { error?: string })?.error || "Slot already booked" };
  }

  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as Booking;
}

export async function listBookings(
  slug: string,
  params: { phone?: string; name?: string }
): Promise<{ business: { name: string; slug: string }; bookings: Booking[] }> {
  const qs = new URLSearchParams();
  if (params.phone) qs.set("phone", params.phone);
  if (params.name) qs.set("name", params.name);

  const res = await fetch(
    `${API_BASE_URL}/api/b/${encodeURIComponent(slug)}/my-bookings?${qs.toString()}`
  );

  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as { business: { name: string; slug: string }; bookings: Booking[] };
}

export async function cancelBooking(slug: string, id: number, phone: string): Promise<{ ok: true }> {
  const qs = new URLSearchParams({ phone });

  const res = await fetch(
    `${API_BASE_URL}/api/b/${encodeURIComponent(slug)}/my-bookings/${id}?${qs.toString()}`,
    { method: "DELETE" }
  );

  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as { ok: true };
}

/* ---------------- logged-in account bookings ---------------- */

export async function listMyAccountBookings(): Promise<{ bookings: Booking[] }> {
  const res = await fetch(`${API_BASE_URL}/api/me/bookings`, {
    headers: { ...userAuthHeader() },
  });

  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as { bookings: Booking[] };
}

export async function cancelMyAccountBooking(id: number): Promise<{ ok: true }> {
  const res = await fetch(`${API_BASE_URL}/api/me/bookings/${id}`, {
    method: "DELETE",
    headers: { ...userAuthHeader() },
  });

  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as { ok: true };
}

/* ---------------- owner bookings admin ---------------- */

export async function adminListBookings(date: string): Promise<Booking[]> {
  const token = getOwnerToken();
  const res = await fetch(
    `${API_BASE_URL}/api/admin/bookings?date=${encodeURIComponent(date)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as Booking[];
}

export async function adminVerifyPayment(
  id: number
): Promise<{ id: number; paymentStatus: string }> {
  const token = getOwnerToken();
  const res = await fetch(`${API_BASE_URL}/api/admin/bookings/${id}/verify-payment`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });

  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as { id: number; paymentStatus: string };
}

/* ---------------- upload payment proof (multipart) ---------------- */

export async function publicUploadPaymentProof(args: {
  bookingId: number;
  phone: string;
  file: File;
}): Promise<{ ok: true; paymentProof: string }> {
  const form = new FormData();
  form.append("phone", args.phone);
  form.append("file", args.file);

  const res = await fetch(
    `${API_BASE_URL}/api/public/bookings/${args.bookingId}/payment-proof`,
    { method: "POST", body: form }
  );

  // cannot use throwIfNotOk because parseJsonOrNull consumes body text already,
  // but we still can:
  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as { ok: true; paymentProof: string };
}

/* ---------------- AI (optional) ---------------- */

export async function aiChat(message: string): Promise<{ reply: string }> {
  const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  await throwIfNotOk(res);
  return (await parseJsonOrNull(res)) as { reply: string };
}
