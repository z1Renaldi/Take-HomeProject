const BASE = import.meta.env.VITE_API_URL ?? "";

export type BookingStatus = "CONFIRMED" | "CANCELLED";

export interface Booking {
  id: string;
  organizerId: string;
  startUtc: string;
  endUtc: string;
  inviteeName: string;
  inviteeEmail: string;
  status: BookingStatus;
}

export interface Organizer {
  id: string;
  timeZone: string;
}

export interface OrganizerSummary {
  id: string;
  name: string;
  timeZone: string;
}
export type SlotsResponse = { slots: string[] };

export async function getOrganizers(): Promise<{
  organizers: OrganizerSummary[];
}> {
  const r = await fetch(`${BASE}/api/organizers`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getSlots(
  organizerId: string,
  days = 14
): Promise<SlotsResponse> {
  const r = await fetch(
    `${BASE}/api/slots?organizerId=${organizerId}&days=${days}`
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function createBooking(payload: {
  organizerId: string;
  startUtc: string;
  invitee: { name: string; email: string };
}): Promise<{ booking: Booking }> {
  const r = await fetch(`${BASE}/api/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getBookings(
  organizerId: string
): Promise<{ bookings: Booking[] }> {
  const r = await fetch(`${BASE}/api/bookings/${organizerId}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function cancelBooking(id: string): Promise<{ ok: true }> {
  const r = await fetch(`${BASE}/api/book/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function rescheduleBooking(
  id: string,
  startUtc: string
): Promise<{ booking: Booking }> {
  const r = await fetch(`${BASE}/api/book/${id}/reschedule`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ startUtc }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getOrganizerAndSettings(organizerId: string): Promise<{
  organizer: Organizer;
  settings: unknown;
}> {
  const r = await fetch(`${BASE}/api/settings/${organizerId}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function updateSettings(organizerId: string, payload: unknown) {
  const r = await fetch(`${BASE}/api/settings/${organizerId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
