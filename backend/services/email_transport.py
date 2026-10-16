"""Gmail API email transport (HTTPS).

Used where outbound SMTP is blocked (Render free web services block ports 25, 465
and 587). Sends as the sender's own Gmail account with an OAuth 2.0 refresh token
that has the gmail.send scope. Uses only the existing httpx dependency.

Errors never include credentials, tokens or message contents.
"""
import base64
import re
import threading
import time
from email.message import Message
from typing import Callable, Optional

import httpx

TOKEN_URL = "https://oauth2.googleapis.com/token"
SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
REQUEST_TIMEOUT_SECONDS = 10.0
# Refresh a little before Google's expiry so a token never expires mid-request
TOKEN_EXPIRY_MARGIN_SECONDS = 60


class GmailApiError(Exception):
    """A Gmail API call failed. The message is safe to log."""


def _error_reason(response: httpx.Response) -> str:
    """Short machine-readable reason from a Google error body, e.g. " (invalid_grant)"."""
    try:
        body = response.json()
    except ValueError:
        return ""
    reason = body.get("error") if isinstance(body, dict) else None
    if isinstance(reason, dict):  # Gmail API errors: {"error": {"status": "UNAUTHENTICATED", ...}}
        reason = reason.get("status")
    if isinstance(reason, str) and re.fullmatch(r"[A-Za-z_]{1,64}", reason):
        return f" ({reason})"
    return ""


class GmailApiTransport:
    """Send MIME messages through the Gmail API with a cached OAuth access token."""

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        refresh_token: str,
        sender: str,
        client_factory: Optional[Callable[[], httpx.Client]] = None,
    ):
        self._client_id = client_id
        self._client_secret = client_secret
        self._refresh_token = refresh_token
        self.sender = sender
        self._client_factory = client_factory or (lambda: httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS))
        self._lock = threading.Lock()
        self._access_token: Optional[str] = None
        self._expires_at = 0.0

    @property
    def configured(self) -> bool:
        """True only when every setting needed to send is present."""
        return all((self._client_id, self._client_secret, self._refresh_token, self.sender))

    def send(self, msg: Message) -> None:
        """Send a complete MIME message (recipients come from its headers).

        Raises GmailApiError on failure. A 401 refreshes the token and retries once.
        """
        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("ascii")
        with self._client_factory() as client:
            token = self._get_token(client)
            response = self._post_send(client, token, raw)
            if response.status_code == 401:
                token = self._get_token(client, stale_token=token)
                response = self._post_send(client, token, raw)
            if not 200 <= response.status_code < 300:  # redirects are failures too
                raise GmailApiError(
                    f"Gmail API send failed with HTTP {response.status_code}{_error_reason(response)}"
                )

    def _post_send(self, client: httpx.Client, token: str, raw: str) -> httpx.Response:
        try:
            return client.post(SEND_URL, headers={"Authorization": f"Bearer {token}"}, json={"raw": raw})
        except httpx.HTTPError as e:
            raise GmailApiError(f"Gmail API send request failed: {type(e).__name__}") from None

    def _get_token(self, client: httpx.Client, stale_token: Optional[str] = None) -> str:
        """Cached access token, refreshed when expired or when stale_token was rejected.

        The lock makes concurrent senders share a single refresh."""
        with self._lock:
            if self._access_token and time.monotonic() < self._expires_at:
                if stale_token is None or self._access_token != stale_token:
                    return self._access_token
            return self._refresh(client)

    def _refresh(self, client: httpx.Client) -> str:
        self._access_token = None
        try:
            response = client.post(TOKEN_URL, data={
                "grant_type": "refresh_token",
                "client_id": self._client_id,
                "client_secret": self._client_secret,
                "refresh_token": self._refresh_token,
            })
        except httpx.HTTPError as e:
            raise GmailApiError(f"Gmail API token refresh request failed: {type(e).__name__}") from None
        if response.status_code != 200:
            raise GmailApiError(
                f"Gmail API token refresh failed with HTTP {response.status_code}{_error_reason(response)}"
            )
        try:
            payload = response.json()
            token = payload["access_token"]
            expires_in = int(payload.get("expires_in", 3600))
        except (ValueError, KeyError, TypeError):
            raise GmailApiError("Gmail API token refresh returned an unexpected response") from None
        if not isinstance(token, str) or not token:
            raise GmailApiError("Gmail API token refresh returned an unexpected response")
        self._access_token = token
        self._expires_at = time.monotonic() + max(0, expires_in - TOKEN_EXPIRY_MARGIN_SECONDS)
        return token
