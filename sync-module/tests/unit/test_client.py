"""Unit tests for api.client.SyncApiClient.send_raw_payload.

This method is the single decision point behind every delivery guarantee:
  200/201  -> SENT     (delete from buffer)
  400/403  -> DISCARD  (drop the payload, never retry — invalid token/competition)
  5xx/4xx* -> RETRY    (transient; keep payload, stop the FIFO drain)
  network  -> RETRY

(* any non-2xx that isn't 400/403, e.g. 404/500/502, is treated as RETRY.)

requests.post is mocked so no network is touched. We assert both the returned
constant and that the wire format is correct (UTF-8 bytes + Bearer header).
"""
from unittest.mock import patch, MagicMock

import pytest
import requests

from api.client import (
    SyncApiClient,
    SEND_RESULT_SENT,
    SEND_RESULT_DISCARD,
    SEND_RESULT_RETRY,
)


def _response(status_code, text=""):
    resp = MagicMock()
    resp.status_code = status_code
    resp.text = text
    return resp


@pytest.fixture
def client():
    return SyncApiClient(token="tok-abc", base_url="http://localhost:3000")


class TestStatusMapping:
    @pytest.mark.parametrize("status", [200, 201])
    def test_success_codes_return_sent(self, client, status):
        with patch("api.client.requests.post", return_value=_response(status)):
            assert client.send_raw_payload("/api/v1/sync/results", "{}") == SEND_RESULT_SENT

    @pytest.mark.parametrize("status", [400, 403])
    def test_permanent_codes_return_discard(self, client, status):
        with patch("api.client.requests.post", return_value=_response(status, "bad token")):
            assert client.send_raw_payload("/api/v1/sync/results", "{}") == SEND_RESULT_DISCARD

    @pytest.mark.parametrize("status", [404, 408, 429, 500, 502, 503])
    def test_other_codes_return_retry(self, client, status):
        # Anything not 2xx and not 400/403 is transient -> keep and retry.
        with patch("api.client.requests.post", return_value=_response(status, "oops")):
            assert client.send_raw_payload("/api/v1/sync/results", "{}") == SEND_RESULT_RETRY


class TestNetworkErrors:
    @pytest.mark.parametrize(
        "exc",
        [
            requests.exceptions.ConnectionError("refused"),
            requests.exceptions.Timeout("timed out"),
            requests.exceptions.RequestException("generic"),
        ],
    )
    def test_network_exceptions_return_retry(self, client, exc):
        with patch("api.client.requests.post", side_effect=exc):
            assert client.send_raw_payload("/api/v1/sync/meet", "{}") == SEND_RESULT_RETRY


class TestWireFormat:
    def test_payload_is_utf8_encoded_bytes(self, client):
        # Cyrillic must be transmitted as UTF-8 bytes (CLAUDE.md payload rule),
        # not a str, to avoid "Unterminated string" errors server-side.
        json_str = '{"lastName":"Петренко"}'
        with patch("api.client.requests.post", return_value=_response(200)) as mock_post:
            client.send_raw_payload("/api/v1/sync/meet", json_str)
        _, kwargs = mock_post.call_args
        assert kwargs["data"] == json_str.encode("utf-8")
        assert isinstance(kwargs["data"], bytes)

    def test_bearer_token_and_content_type_headers(self, client):
        with patch("api.client.requests.post", return_value=_response(200)) as mock_post:
            client.send_raw_payload("/api/v1/sync/results", "{}")
        _, kwargs = mock_post.call_args
        assert kwargs["headers"]["Authorization"] == "Bearer tok-abc"
        assert kwargs["headers"]["Content-Type"] == "application/json"

    def test_url_is_base_plus_endpoint(self, client):
        with patch("api.client.requests.post", return_value=_response(200)) as mock_post:
            client.send_raw_payload("/api/v1/sync/results", "{}")
        args, kwargs = mock_post.call_args
        # url is the first positional arg
        assert args[0] == "http://localhost:3000/api/v1/sync/results"

    def test_request_has_timeout(self, client):
        with patch("api.client.requests.post", return_value=_response(200)) as mock_post:
            client.send_raw_payload("/api/v1/sync/results", "{}")
        _, kwargs = mock_post.call_args
        assert kwargs["timeout"] == 10.0


class TestTokenUpdate:
    def test_update_token_changes_auth_header(self, client):
        client.update_token("tok-new")
        with patch("api.client.requests.post", return_value=_response(200)) as mock_post:
            client.send_raw_payload("/api/v1/sync/results", "{}")
        _, kwargs = mock_post.call_args
        assert kwargs["headers"]["Authorization"] == "Bearer tok-new"
