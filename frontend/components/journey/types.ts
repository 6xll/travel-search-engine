/**
 * UI data contract for the redesigned journey components.
 * Mirrors the backend's normalized journey shape.
 */

export type TransportMode = "flight" | "bus" | "train";

export interface RouteSegment {
  id: string;
  transport_type: TransportMode;
  origin_city: string;
  destination_city: string;
  departure_at: string; // ISO date
  arrival_at: string; // ISO date
  provider_name: string;
}

export interface ScoreBreakdown {
  price_component: number;
  travel_time_component: number;
  wait_time_component: number;
  layover_component: number;
  final_score: number; // 0-100
}

export interface Journey {
  id: string;
  segments: RouteSegment[];
  score: number;
  score_breakdown: ScoreBreakdown;
  total_price: number;
  total_duration_minutes: number;
  total_wait_minutes: number;
  layover_count: number;
}

export type SearchPreference = "balanced" | "cheapest" | "fastest";

export type TripType = "one_way" | "round_trip";

export interface SearchValues {
  origin: string;
  destination: string;
  date: string; // yyyy-mm-dd
  returnDate: string; // yyyy-mm-dd (used when tripType === "round_trip")
  tripType: TripType;
  flexibleDays: number; // 0-3
  passengers: number;
  preference: SearchPreference;
}
