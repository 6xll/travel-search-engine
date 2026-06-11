"""Unit tests for route composition and connection rules."""

from app.algorithms.route_composer import CompositionConfig, compose_journeys
from app.models.enums import TransportType

from tests.conftest import make_segment


class TestDirectAndOneStop:
    def test_direct_segments_become_single_segment_journeys(self) -> None:
        direct = [make_segment("Porto", "Tokyo")]
        journeys = compose_journeys(
            direct_segments=direct, first_leg_segments=[], second_legs_by_city={}
        )
        assert len(journeys) == 1
        assert journeys[0].layover_count == 0

    def test_one_stop_with_valid_connection(self) -> None:
        first = make_segment("Porto", "Madrid", duration_minutes=80)
        second = make_segment("Madrid", "Tokyo", depart_offset_minutes=80 + 90)
        journeys = compose_journeys(
            direct_segments=[],
            first_leg_segments=[first],
            second_legs_by_city={"madrid": [second]},
        )
        assert len(journeys) == 1
        assert journeys[0].layover_count == 1
        assert journeys[0].total_wait_minutes == 90

    def test_connection_shorter_than_minimum_rejected(self) -> None:
        first = make_segment("Porto", "Madrid", duration_minutes=80)
        # 30 min < 60 min minimum before a flight
        second = make_segment("Madrid", "Tokyo", depart_offset_minutes=80 + 30)
        journeys = compose_journeys(
            direct_segments=[],
            first_leg_segments=[first],
            second_legs_by_city={"madrid": [second]},
        )
        assert journeys == []

    def test_bus_connection_allows_shorter_transfer(self) -> None:
        first = make_segment("Porto", "Madrid", duration_minutes=80)
        second = make_segment(
            "Madrid", "Barcelona",
            depart_offset_minutes=80 + 35,
            transport_type=TransportType.BUS,
        )
        journeys = compose_journeys(
            direct_segments=[],
            first_leg_segments=[first],
            second_legs_by_city={"madrid": [second]},
        )
        assert len(journeys) == 1

    def test_wait_beyond_maximum_rejected(self) -> None:
        config = CompositionConfig(max_wait_minutes=120)
        first = make_segment("Porto", "Madrid", duration_minutes=80)
        second = make_segment("Madrid", "Tokyo", depart_offset_minutes=80 + 121)
        journeys = compose_journeys(
            direct_segments=[],
            first_leg_segments=[first],
            second_legs_by_city={"madrid": [second]},
            config=config,
        )
        assert journeys == []

    def test_overnight_connection_within_default_window(self) -> None:
        # Arrive 22:00, depart 09:00 next day: 660 min wait, within 900.
        first = make_segment("Porto", "Madrid", duration_minutes=14 * 60)
        second = make_segment(
            "Madrid", "Tokyo", depart_offset_minutes=14 * 60 + 660
        )
        journeys = compose_journeys(
            direct_segments=[],
            first_leg_segments=[first],
            second_legs_by_city={"madrid": [second]},
        )
        assert len(journeys) == 1


class TestTwoStop:
    def test_two_stop_chain_composed(self) -> None:
        first = make_segment("Porto", "Lisbon", duration_minutes=60,
                             transport_type=TransportType.TRAIN)
        mid = make_segment("Lisbon", "Madrid", depart_offset_minutes=60 + 45,
                           duration_minutes=75,
                           transport_type=TransportType.TRAIN)
        second = make_segment("Madrid", "Tokyo",
                              depart_offset_minutes=60 + 45 + 75 + 90)
        journeys = compose_journeys(
            direct_segments=[],
            first_leg_segments=[first],
            second_legs_by_city={"madrid": [second]},
            mid_legs_by_city={"lisbon": [mid]},
        )
        assert len(journeys) == 1
        assert journeys[0].layover_count == 2
        assert [s.origin.city_name for s in journeys[0].segments] == [
            "Porto", "Lisbon", "Madrid",
        ]

    def test_two_stop_loop_back_to_origin_rejected(self) -> None:
        first = make_segment("Porto", "Lisbon", duration_minutes=60)
        loop_back = make_segment("Lisbon", "Porto", depart_offset_minutes=60 + 90)
        journeys = compose_journeys(
            direct_segments=[],
            first_leg_segments=[first],
            second_legs_by_city={"porto": [make_segment("Porto", "Tokyo")]},
            mid_legs_by_city={"lisbon": [loop_back]},
        )
        assert journeys == []


def test_max_candidates_cap_enforced() -> None:
    config = CompositionConfig(max_candidates=3)
    direct = [make_segment("Porto", "Tokyo", depart_offset_minutes=i * 10)
              for i in range(10)]
    journeys = compose_journeys(
        direct_segments=direct, first_leg_segments=[], second_legs_by_city={},
        config=config,
    )
    assert len(journeys) == 3
