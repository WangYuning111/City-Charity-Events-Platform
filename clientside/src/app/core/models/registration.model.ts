/** Payload for POST /api/registrations. */
export interface RegistrationPayload {
  event_id: number;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string | null;
  tickets_purchased: number;
  special_requests?: string | null;
}
