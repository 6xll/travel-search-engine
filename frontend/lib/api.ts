/** Typed client for the travel search backend. */

import type { City, Journey, SearchRequestPayload, SearchResult } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseErrorDetail(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "detail" in body) {
      const detail = (body as { detail: unknown }).detail;
      if (typeof detail === "string") return detail;
      return JSON.stringify(detail);
    }
  } catch {
    // fall through to generic message
  }
  return `Request failed with status ${response.status}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    throw new ApiError(await parseErrorDetail(response), response.status);
  }
  return (await response.json()) as T;
}

export function searchJourneys(
  payload: SearchRequestPayload,
): Promise<SearchResult> {
  return request<SearchResult>("/search", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getJourney(journeyId: string): Promise<Journey> {
  return request<Journey>(`/journey/${journeyId}`);
}

export function getCities(): Promise<City[]> {
  return request<City[]>("/cities");
}
