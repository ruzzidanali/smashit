export type Court = {
  id: number;
  name: string;
  isActive?: boolean;
};

export type Booking = {
  id: number;
  courtId: number;
  date: string; // YYYY-MM-DD
  startMinutes: number;
  endMinutes: number;
  customerName: string;
  phone: string;
  status?: "CONFIRMED" | "CANCELLED";
  createdAt?: string;
  court?: Court;
  paymentStatus?: "PENDING" | "SUBMITTED" | "VERIFIED";
  paymentProof?: string | null;
};

export type AvailabilityResponse = {
  date: string;
  bookings: { id: number; courtId: number; startMinutes: number; endMinutes: number }[];
};
