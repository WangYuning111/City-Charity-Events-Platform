export type EventStatus = 'upcoming' | 'active' | 'past' | 'suspended';

export const EVENT_STATUSES: EventStatus[] = ['upcoming', 'active', 'past', 'suspended'];

export interface EventRegistration {
  registration_id: number;
  event_id: number;
  attendee_name: string;
  attendee_email: string;
  attendee_phone: string | null;
  tickets_purchased: number;
  registration_date: string;
  special_requests: string | null;
  /** Joined by GET /api/registrations so the dashboard can label each row. */
  event_name?: string;
}

export interface EventCategory {
  category_id: number;
  category_name: string;
  category_description: string | null;
  icon_class: string | null;
  event_count: number;
}

export interface Organization {
  org_id: number;
  org_name: string;
  mission_statement: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
}

export interface CharityEvent {
  event_id: number;
  event_name: string;
  short_description: string | null;
  full_description?: string | null;

  category_id: number;
  category_name: string;

  org_id: number | null;
  org_name: string | null;

  event_date: string;
  event_time: string;
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

  created_at?: string;
  updated_at?: string;

  registration_count?: number;
  tickets_sold?: number;
  registrations?: EventRegistration[];
}

export interface EventPayload {
  event_name: string;
  short_description: string | null;
  full_description: string | null;
  category_id: number;
  org_id: number | null;
  event_date: string;
  event_time: string;
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
  organizer_contact: string | null;
}
