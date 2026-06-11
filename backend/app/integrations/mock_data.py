"""Static route network backing the mock providers.

All times are modeled in UTC for MVP simplicity; real adapters will deal in
local times and convert. City keys are lowercase city names.
"""

from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class MockCity:
    name: str
    country_code: str
    timezone: str
    latitude: float
    longitude: float
    airport_iata: str
    airport_name: str


@dataclass(frozen=True)
class MockRoute:
    origin_key: str
    destination_key: str
    carrier_code: str
    carrier_name: str
    base_price: Decimal
    duration_minutes: int
    daily_departures: int


CITIES: dict[str, MockCity] = {
    city.name.lower(): city
    for city in (
        MockCity("Porto", "PT", "Europe/Lisbon", 41.1496, -8.6109, "OPO", "Francisco Sá Carneiro Airport"),
        MockCity("Lisbon", "PT", "Europe/Lisbon", 38.7223, -9.1393, "LIS", "Humberto Delgado Airport"),
        MockCity("Madrid", "ES", "Europe/Madrid", 40.4168, -3.7038, "MAD", "Adolfo Suárez Madrid-Barajas Airport"),
        MockCity("Barcelona", "ES", "Europe/Madrid", 41.3874, 2.1686, "BCN", "Josep Tarradellas Barcelona-El Prat Airport"),
        MockCity("Paris", "FR", "Europe/Paris", 48.8566, 2.3522, "CDG", "Charles de Gaulle Airport"),
        MockCity("London", "GB", "Europe/London", 51.5072, -0.1276, "LHR", "Heathrow Airport"),
        MockCity("Amsterdam", "NL", "Europe/Amsterdam", 52.3676, 4.9041, "AMS", "Amsterdam Airport Schiphol"),
        MockCity("Frankfurt", "DE", "Europe/Berlin", 50.1109, 8.6821, "FRA", "Frankfurt Airport"),
        MockCity("Rome", "IT", "Europe/Rome", 41.9028, 12.4964, "FCO", "Leonardo da Vinci-Fiumicino Airport"),
        MockCity("Tokyo", "JP", "Asia/Tokyo", 35.6764, 139.6500, "NRT", "Narita International Airport"),
        MockCity("New York", "US", "America/New_York", 40.7128, -74.0060, "JFK", "John F. Kennedy International Airport"),
        MockCity("Dubai", "AE", "Asia/Dubai", 25.2048, 55.2708, "DXB", "Dubai International Airport"),
    )
}


def _route(
    origin: str,
    destination: str,
    carrier_code: str,
    carrier_name: str,
    base_price: str,
    duration_minutes: int,
    daily_departures: int,
) -> list[MockRoute]:
    """Build a route and its mirror (same carrier serves both directions)."""
    forward = MockRoute(
        origin, destination, carrier_code, carrier_name,
        Decimal(base_price), duration_minutes, daily_departures,
    )
    backward = MockRoute(
        destination, origin, carrier_code, carrier_name,
        Decimal(base_price), duration_minutes, daily_departures,
    )
    return [forward, backward]


FLIGHT_ROUTES: list[MockRoute] = [
    *_route("porto", "madrid", "IB", "Iberia", "85.00", 80, 3),
    *_route("porto", "lisbon", "TP", "TAP Air Portugal", "60.00", 55, 4),
    *_route("porto", "paris", "TP", "TAP Air Portugal", "120.00", 150, 3),
    *_route("porto", "london", "BA", "British Airways", "110.00", 145, 2),
    *_route("porto", "frankfurt", "LH", "Lufthansa", "140.00", 175, 2),
    *_route("lisbon", "madrid", "IB", "Iberia", "80.00", 75, 4),
    *_route("lisbon", "new york", "TP", "TAP Air Portugal", "420.00", 470, 2),
    *_route("madrid", "barcelona", "IB", "Iberia", "70.00", 70, 5),
    *_route("madrid", "tokyo", "IB", "Iberia", "650.00", 840, 2),
    *_route("madrid", "dubai", "EK", "Emirates", "380.00", 425, 2),
    *_route("madrid", "new york", "IB", "Iberia", "450.00", 490, 2),
    *_route("paris", "tokyo", "AF", "Air France", "720.00", 810, 2),
    *_route("paris", "new york", "AF", "Air France", "430.00", 465, 3),
    *_route("paris", "amsterdam", "AF", "Air France", "95.00", 80, 4),
    *_route("london", "tokyo", "BA", "British Airways", "740.00", 825, 2),
    *_route("london", "new york", "BA", "British Airways", "390.00", 455, 4),
    *_route("frankfurt", "tokyo", "LH", "Lufthansa", "690.00", 800, 2),
    *_route("amsterdam", "tokyo", "KL", "KLM", "700.00", 805, 2),
    *_route("rome", "madrid", "AZ", "ITA Airways", "105.00", 145, 2),
    *_route("dubai", "tokyo", "EK", "Emirates", "520.00", 580, 2),
]

TRAIN_ROUTES: list[MockRoute] = [
    *_route("porto", "lisbon", "CP", "CP Alfa Pendular", "25.00", 165, 5),
    *_route("lisbon", "madrid", "RNF", "Renfe Lusitania", "60.00", 540, 1),
    *_route("madrid", "barcelona", "AVE", "Renfe AVE", "45.00", 150, 6),
    *_route("paris", "london", "EST", "Eurostar", "80.00", 140, 6),
    *_route("paris", "amsterdam", "THA", "Eurostar Thalys", "60.00", 200, 5),
    *_route("paris", "frankfurt", "ICE", "DB ICE", "70.00", 230, 4),
    *_route("amsterdam", "frankfurt", "ICE", "DB ICE", "50.00", 240, 4),
]

BUS_ROUTES: list[MockRoute] = [
    *_route("porto", "lisbon", "FLX", "FlixBus", "12.00", 210, 6),
    *_route("porto", "madrid", "FLX", "FlixBus", "28.00", 330, 3),
    *_route("lisbon", "madrid", "ALSA", "ALSA", "32.00", 380, 3),
    *_route("madrid", "barcelona", "ALSA", "ALSA", "25.00", 460, 4),
    *_route("barcelona", "paris", "FLX", "FlixBus", "45.00", 620, 2),
    *_route("paris", "london", "FLX", "FlixBus", "35.00", 540, 3),
    *_route("paris", "amsterdam", "FLX", "FlixBus", "30.00", 420, 3),
    *_route("paris", "frankfurt", "FLX", "FlixBus", "38.00", 510, 2),
    *_route("amsterdam", "frankfurt", "FLX", "FlixBus", "26.00", 380, 3),
]
