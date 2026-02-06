export type Court = {
  id: number;
  name: string;
  isActive?: boolean;
};

export type Booking = {
  id: number;
  businessId: number;
  courtId: number;
  date: string;
  startMinutes: number;
  endMinutes: number;
  customerName: string;
  phone: string;
  status: string;
  paymentStatus?: string;
  paymentProof?: string | null;
  court?: { id: number; name: string };
  business?: { id: number; name: string; slug: string };
};


export type AvailabilityResponse = {
  date: string;
  bookings: { id: number; courtId: number; startMinutes: number; endMinutes: number }[];
};
