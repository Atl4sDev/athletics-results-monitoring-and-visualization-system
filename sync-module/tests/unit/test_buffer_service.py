"""Unit tests for services.buffer_service.BufferService.

The buffer is the FIFO queue that guarantees ordered delivery (ADR-0003). The
contract under test:
  - save_to_buffer inserts a 'pending' row
  - get_unsent_payloads returns (id, endpoint, payload) ordered by id ASC
  - mark_as_sent DELETEs the row (not a status update — confirmed by re-reading)

Each test runs against a throwaway SQLite file created by init_db(), so the
real buffer.db is never touched. We patch db_manager.DB_FILE, which both
init_db() and get_connection() read at call time.
"""
import pytest

from database import db_manager
from services.buffer_service import BufferService

MEET = "/api/v1/sync/meet"
RESULTS = "/api/v1/sync/results"


@pytest.fixture
def temp_db(tmp_path, monkeypatch):
    db_path = tmp_path / "buffer.db"
    monkeypatch.setattr(db_manager, "DB_FILE", str(db_path))
    db_manager.init_db()
    return db_path


class TestSaveAndRead:
    def test_saved_payload_is_retrievable(self, temp_db):
        BufferService.save_to_buffer(RESULTS, '{"heatNumber":1}')
        rows = BufferService.get_unsent_payloads()
        assert len(rows) == 1
        row_id, endpoint, payload = rows[0]
        assert isinstance(row_id, int)
        assert endpoint == RESULTS
        assert payload == '{"heatNumber":1}'

    def test_empty_queue_returns_empty_list(self, temp_db):
        assert BufferService.get_unsent_payloads() == []

    def test_tuple_shape_is_id_endpoint_payload(self, temp_db):
        BufferService.save_to_buffer(MEET, "{}")
        (row,) = BufferService.get_unsent_payloads()
        assert len(row) == 3


class TestFifoOrdering:
    def test_payloads_returned_in_insertion_order(self, temp_db):
        for i in range(1, 6):
            BufferService.save_to_buffer(RESULTS, f'{{"seq":{i}}}')
        rows = BufferService.get_unsent_payloads()

        ids = [r[0] for r in rows]
        payloads = [r[2] for r in rows]
        assert ids == sorted(ids)  # strictly ascending by id
        assert payloads == [f'{{"seq":{i}}}' for i in range(1, 6)]

    def test_order_is_by_id_not_endpoint(self, temp_db):
        # Interleave endpoints; FIFO must still follow insertion order.
        BufferService.save_to_buffer(MEET, "A")
        BufferService.save_to_buffer(RESULTS, "B")
        BufferService.save_to_buffer(MEET, "C")
        payloads = [r[2] for r in BufferService.get_unsent_payloads()]
        assert payloads == ["A", "B", "C"]


class TestMarkAsSent:
    def test_mark_as_sent_removes_only_that_row(self, temp_db):
        BufferService.save_to_buffer(RESULTS, "first")
        BufferService.save_to_buffer(RESULTS, "second")
        first_id = BufferService.get_unsent_payloads()[0][0]

        BufferService.mark_as_sent(first_id)

        remaining = BufferService.get_unsent_payloads()
        assert [r[2] for r in remaining] == ["second"]

    def test_draining_in_order_empties_the_queue(self, temp_db):
        for i in range(3):
            BufferService.save_to_buffer(RESULTS, str(i))
        # Simulate the daemon: read FIFO, delete each as it succeeds.
        for row_id, _endpoint, _payload in BufferService.get_unsent_payloads():
            BufferService.mark_as_sent(row_id)
        assert BufferService.get_unsent_payloads() == []

    def test_mark_as_sent_deletes_rather_than_status_updates(self, temp_db):
        # The row must be gone entirely, not left behind with status='sent'.
        BufferService.save_to_buffer(RESULTS, "x")
        row_id = BufferService.get_unsent_payloads()[0][0]
        BufferService.mark_as_sent(row_id)

        conn = db_manager.get_connection()
        count = conn.execute(
            "SELECT COUNT(*) FROM payload_queue WHERE id = ?", (row_id,)
        ).fetchone()[0]
        conn.close()
        assert count == 0
