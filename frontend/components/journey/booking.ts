/**
 * Outbound deep links for a segment.
 *
 * NOTE: journey inventory is simulated, so there is no booking page for a
 * specific mock departure. These links instead open a real, live search for
 * the segment's route (and date, where the provider supports it) on a real
 * third-party site — the honest, useful version of "book this leg".
 */

import type { RouteSegment } from "./types";

interface BookingLink {
  url: string;
  provider: string;
}

export function bookingLink(segment: RouteSegment): BookingLink {
  const origin = encodeURIComponent(segment.origin_city);
  const destination = encodeURIComponent(segment.destination_city);
  const date = segment.departure_at.slice(0, 10);

  if (segment.transport_type === "flight") {
    const query = encodeURIComponent(
      `Flights from ${segment.origin_city} to ${segment.destination_city} on ${date}`,
    );
    return {
      url: `https://www.google.com/travel/flights?q=${query}`,
      provider: "Google Flights",
    };
  }

  // Bus & train: Rome2Rio is multimodal and accepts plain city names.
  return {
    url: `https://www.rome2rio.com/map/${origin}/${destination}`,
    provider: "Rome2Rio",
  };
}
