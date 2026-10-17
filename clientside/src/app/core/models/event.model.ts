/**
 * Domain models mirroring the REST API payloads (see api/routes/events.js).
 * Keeping these interfaces in one place gives the whole application a single,
 * type-checked contract with the backend.
 */

export type EventStatus = 'upcoming' | 'active' | 'past' | 'suspended';

export interface EventCategory {
  category_id: number;
  category_name: string;
  category_description: string | null;
  icon_class: string | null;
  event_count: number;
}

export interface EventRegistration {
  registration_id: number;
  event_id: number;
  attendee_name: string;
  attendee_email: string;
  attendee_phone: string | null;
  tickets_purchased: number;
  registration_date: string;
  special_requests: string | null;
}

/** A charity event exactly as returned by the API. */
export interface CharityEvent {
  event_id: number;
  event_name: string;
  short_description: string | null;
  full_description?: string | null;

  category_id: number;
  category_name: string;
  category_description?: string | null;
  icon_class?: string | null;

  org_id: number | null;
  org_name: string | null;
  mission_statement?: string | null;
  org_description?: string | null;

  event_date: string;        // YYYY-MM-DD (driver returns date strings)
  event_time: string;        // HH:MM:SS
  location: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;

  image_url: string | null;
  ticket_price: number;
  goal_amount: number;
  current_amount: number;
  status: EventStatus;
  max_participants: number | null;
  organizer_contact?: string | null;

  // Server-computed, present on the detail endpoint
  progress_percentage?: number;
  registration_count?: number;
  tickets_sold?: number;
  tickets_remaining?: number | null;
  registrations?: EventRegistration[];
}

/** Query string accepted by GET /api/events/search. */
export interface EventFilters {
  date?: string | null;
  location?: string | null;
  category?: number | string | null;
  freeOnly?: boolean;
}

/** Payload for POST /api/events and PUT /api/events/:id. */
export interface EventPayload {
  event_name: string;
  short_description?: string | null;
  full_description?: string | null;
  category_id: number;
  org_id?: number | null;
  event_date: string;
  event_time: string;
  location: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  image_url?: string | null;
  ticket_price?: number;
  goal_amount?: number;
  current_amount?: number;
  status: EventStatus;
  max_participants?: number | null;
  organizer_contact?: string | null;
}
