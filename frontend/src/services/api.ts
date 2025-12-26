import { API_BASE_URL } from "../config";
import type { Booking, Court, AvailabilityResponse } from "../types";

export type OwnerBusiness = {
  id: number;
  name: string;
  slug: string;
  address?: string | null;
  state?: string | null;
  city?: string | null;
  postcode?: string | null;
  phone?: string | null;
  createdAt?: string;
};

function getOwnerToken() {
  return localStorage.getItem("smashit_owner_token") || "";
}

export async function getBusinessProfile(): Promise<OwnerBusiness> {
  const token = getOwnerToken();
  const res = await fetch(`${API_BASE_URL}/api/admin/business/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as OwnerBusiness;
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

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as OwnerBusiness;
}


export async function listStates() {
  const res = await fetch(`${API_BASE_URL}/api/public/locations/states`);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as string[];
}

export async function listCities(state: string) {
  const qs = new URLSearchParams({ state });
  const res = await fetch(`${API_BASE_URL}/api/public/locations/cities?${qs.toString()}`);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as string[];
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

export async function listBusinesses(state?: string, city?: string) {
  const qs = new URLSearchParams();
  if (state) qs.set("state", state);
  if (city) qs.set("city", city);

  const url =
    `${API_BASE_URL}/api/public/businesses` + (qs.toString() ? `?${qs.toString()}` : "");

  const res = await fetch(url);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as PublicBusiness[];
}

type CourtsResponse = { business: { id: number; name: string; slug: string }; courts: Court[] };

export async function getCourts(slug: string): Promise<CourtsResponse> {
  const r = await fetch(`${API_BASE_URL}/api/b/${encodeURIComponent(slug)}/courts`);
  if (!r.ok) throw new Error("Failed to load courts");
  return r.json();
}

export async function getAvailability(slug: string, date: string): Promise<AvailabilityResponse> {
  const r = await fetch(
    `${API_BASE_URL}/api/b/${encodeURIComponent(slug)}/availability?date=${encodeURIComponent(date)}`
  );
  if (!r.ok) throw new Error("Failed to load availability");
  return r.json();
}

export async function createBooking(
  slug: string,
  payload: Omit<Booking, "id" | "status" | "createdAt" | "court">
) {
  const r = await fetch(`${API_BASE_URL}/api/b/${encodeURIComponent(slug)}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await r.json().catch(() => ({}));

  if (r.status === 409) throw new Error(data?.error || "Slot already booked");
  if (!r.ok) throw new Error(data?.error || "Failed to create booking");

  return data as Booking;
}

export async function listBookings(slug: string, params: { phone?: string; name?: string }) {
  const qs = new URLSearchParams();
  if (params.phone) qs.set("phone", params.phone);
  if (params.name) qs.set("name", params.name);

  const res = await fetch(`${API_BASE_URL}/api/b/${slug}/my-bookings?${qs.toString()}`);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);

  return data as {
    business: { name: string; slug: string };
    bookings: Booking[];
  };
}

/**
 * Backend expects phone in querystring as a simple ownership check.
 */
export async function cancelBooking(slug: string, id: number, phone: string) {
  const qs = new URLSearchParams({ phone });
  const res = await fetch(`${API_BASE_URL}/api/b/${slug}/my-bookings/${id}?${qs.toString()}`, {
    method: "DELETE",
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}


// -------------------------
// AI endpoint (global)
// -------------------------
export async function aiChat(message: string): Promise<{ reply: string }> {
  const r = await fetch(`${API_BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!r.ok) throw new Error("AI request failed");
  return r.json();
}
