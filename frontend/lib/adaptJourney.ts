/**
 * Adapter: maps the backend's nested journey shape (lib/types) to the flat
 * schema the redesigned journey components consume (components/journey/types).
 * Keeps the UI components decoupled from the API contract.
 */

import type {
  Journey as UIJourney,
  TransportMode,
} from "@/components/journey";
import type { Journey as ApiJourney } from "./types";

export function adaptJourney(journey: ApiJourney): UIJourney {
  return {
    id: journey.id,
    segments: journey.segments.map((segment, index) => ({
      id: `${journey.id}-${index}`,
      transport_type: segment.transport_type as TransportMode,
      origin_city: segment.origin.city_name,
      destination_city: segment.destination.city_name,
      departure_at: segment.departure_at,
      arrival_at: segment.arrival_at,
      provider_name: segment.carrier_name,
    })),
    score: journey.score ?? 0,
    score_breakdown: journey.score_breakdown ?? {
      price_component: 0,
      travel_time_component: 0,
      wait_time_component: 0,
      layover_component: 0,
      final_score: journey.score ?? 0,
    },
    total_price: Number(journey.total_price),
    total_duration_minutes: journey.total_duration_minutes,
    total_wait_minutes: journey.total_wait_minutes,
    layover_count: journey.layover_count,
  };
}
