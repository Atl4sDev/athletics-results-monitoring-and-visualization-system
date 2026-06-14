"""Unit tests for services.sync_daemon.SyncDaemon._run_loop.

This is the heart of the ADR-0003 ordered-delivery guarantee. The loop drains
the FIFO buffer and:
  - SENT     -> delete the row, move on
  - DISCARD  -> delete the row anyway (400/403 is permanent), move on
  - RETRY    -> STOP immediately, leave this and every later payload in place,
                and arm a 15s backoff window

Rather than run the real background thread (with its 2s polls), we drive exactly
one pass of the loop body by stubbing the stop-event: is_set() yields
False (while-top), False (post-wait), True (next while-top -> exit). That is
exactly three reads per single body execution.
"""
from unittest.mock import MagicMock, patch

import pytest

from services import sync_daemon
from services.sync_daemon import SyncDaemon
from api.client import SEND_RESULT_SENT, SEND_RESULT_DISCARD, SEND_RESULT_RETRY

RESULTS = "/api/v1/sync/results"
MEET = "/api/v1/sync/meet"


@pytest.fixture
def daemon():
    return SyncDaemon(token="tok", base_url="http://localhost:3000")


def drive_one_pass(daemon, payloads, send_results):
    """Execute a single iteration of the loop body and return the BufferService mock.

    payloads: list of (id, endpoint, payload) tuples the buffer yields.
    send_results: side_effect list for api_client.send_raw_payload.
    """
    daemon._stop_event = MagicMock()
    daemon._stop_event.is_set.side_effect = [False, False, True]
    daemon._stop_event.wait.return_value = None
    daemon.api_client.send_raw_payload = MagicMock(side_effect=send_results)

    with patch.object(sync_daemon, "BufferService") as buf:
        buf.get_unsent_payloads.return_value = payloads
        daemon._run_loop()
    return buf


class TestAllSucceed:
    def test_every_payload_sent_and_deleted_in_order(self, daemon):
        payloads = [(1, RESULTS, "p1"), (2, RESULTS, "p2"), (3, RESULTS, "p3")]
        buf = drive_one_pass(daemon, payloads, [SEND_RESULT_SENT] * 3)

        # Sent in strict FIFO order.
        sent_payloads = [c.args[1] for c in daemon.api_client.send_raw_payload.call_args_list]
        assert sent_payloads == ["p1", "p2", "p3"]
        # Each delivered row deleted, in order.
        deleted_ids = [c.args[0] for c in buf.mark_as_sent.call_args_list]
        assert deleted_ids == [1, 2, 3]
        assert daemon._is_online is True


class TestStopOnFailure:
    def test_retry_halts_the_drain_and_leaves_later_payloads(self, daemon):
        # id=1 succeeds, id=2 fails transiently -> id=3 must NOT be sent.
        payloads = [(1, RESULTS, "p1"), (2, RESULTS, "p2"), (3, RESULTS, "p3")]
        buf = drive_one_pass(daemon, payloads, [SEND_RESULT_SENT, SEND_RESULT_RETRY])

        # Only two sends attempted; the third payload is never touched.
        assert daemon.api_client.send_raw_payload.call_count == 2
        # Only the first (successful) row is deleted; the failed one stays queued.
        deleted_ids = [c.args[0] for c in buf.mark_as_sent.call_args_list]
        assert deleted_ids == [1]

    def test_retry_arms_backoff_and_marks_offline(self, daemon):
        assert daemon._retry_after == 0.0
        with patch.object(sync_daemon.time, "time", return_value=1000.0):
            buf = drive_one_pass(daemon, [(1, RESULTS, "p1")], [SEND_RESULT_RETRY])

        # 15-second backoff window armed from "now".
        assert daemon._retry_after == 1015.0
        assert daemon._is_online is False
        buf.mark_as_sent.assert_not_called()

    def test_first_payload_failing_sends_nothing_else(self, daemon):
        payloads = [(1, RESULTS, "p1"), (2, RESULTS, "p2")]
        buf = drive_one_pass(daemon, payloads, [SEND_RESULT_RETRY])
        assert daemon.api_client.send_raw_payload.call_count == 1
        buf.mark_as_sent.assert_not_called()


class TestDiscard:
    def test_discard_deletes_the_row_and_continues(self, daemon):
        # 400/403: drop the bad payload but keep draining the rest.
        payloads = [(1, RESULTS, "bad"), (2, RESULTS, "good")]
        buf = drive_one_pass(daemon, payloads, [SEND_RESULT_DISCARD, SEND_RESULT_SENT])

        assert daemon.api_client.send_raw_payload.call_count == 2
        deleted_ids = [c.args[0] for c in buf.mark_as_sent.call_args_list]
        assert deleted_ids == [1, 2]  # both removed: one discarded, one sent


class TestBackoffWindow:
    def test_pass_is_skipped_while_backoff_active(self, daemon):
        # If now < _retry_after, the loop must not read or send anything.
        daemon._retry_after = 5000.0
        daemon._stop_event = MagicMock()
        daemon._stop_event.is_set.side_effect = [False, False, True]
        daemon._stop_event.wait.return_value = None
        daemon.api_client.send_raw_payload = MagicMock()

        with patch.object(sync_daemon.time, "time", return_value=4000.0), \
             patch.object(sync_daemon, "BufferService") as buf:
            daemon._run_loop()

        buf.get_unsent_payloads.assert_not_called()
        daemon.api_client.send_raw_payload.assert_not_called()


class TestRecovery:
    def test_success_after_outage_flips_back_online(self, daemon):
        daemon._is_online = False  # simulate a prior outage
        drive_one_pass(daemon, [(1, RESULTS, "p1")], [SEND_RESULT_SENT])
        assert daemon._is_online is True


class TestTokenUpdate:
    def test_update_token_delegates_to_client(self, daemon):
        daemon.api_client.update_token = MagicMock()
        daemon.update_token("tok-new")
        daemon.api_client.update_token.assert_called_once_with("tok-new")
