/**
 * TypeScript mirror of the backend Pydantic schemas.
 * Decimal fields arrive as JSON strings (precision-preserving).
 */

export type TransportType = "flight" | "bus" | "train" | "ferry";

export interface TransportHub {
  code: string;
  name: string;
  city_name: string;
  country_code: string;
}

export interface RouteSegment {
  transport_type: TransportType;
  carrier_name: string;
  service_number: string;
  origin: TransportHub;
  destination: TransportHub;
  departure_at: string;
  arrival_at: string;
  price_amount: string;
  currency: string;
  duration_minutes: number;
}

export interface ScoreBreakdown {
  price_component: number;
  travel_time_component: number;
  wait_time_component: number;
  layover_component: number;
  final_score: number;
}

export interface Journey {
  id: string;
  segments: RouteSegment[];
  score: number | null;
  score_breakdown: ScoreBreakdown | null;
  total_price: string;
  currency: string;
  total_duration_minutes: number;
  in_transit_minutes: number;
  total_wait_minutes: number;
  layover_count: number;
  transport_types: TransportType[];
}

export type SearchPreference = "cheapest" | "fastest" | "balanced";

export interface City {
  id: string;
  name: string;
  country_code: string;
  timezone: string;
  latitude: number;
  longitude: number;
}

export interface SearchRequestPayload {
  origin: string;
  destination: string;
  departure_date: string;
  max_budget?: string;
  max_total_duration_minutes?: number;
  passengers?: number;
  currency?: string;
  preference?: SearchPreference;
  flexible_days?: number;
}

export interface SearchResult {
  search_id: string;
  request: SearchRequestPayload;
  journeys: Journey[];
  total_results: number;
  searched_at: string;
}
