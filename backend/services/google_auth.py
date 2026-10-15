"""Verify Google Sign-In ID tokens (from Google Identity Services) without extra dependencies.

Checks the RS256 signature against Google's published keys, the audience (our OAuth
client ID), issuer, expiry and that Google has verified the email address.
Uses the existing python-jose and httpx packages; keys are cached per Cache-Control.
"""
import re
import threading
import time
from typing import Callable, Optional

import httpx
from jose import jwt, JWTError

GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}
REQUEST_TIMEOUT_SECONDS = 10.0
DEFAULT_KEYS_MAX_AGE = 3600


class GoogleTokenError(Exception):
    """The credential is not a valid Google ID token for this app. Message is safe to show."""


class GoogleKeysUnavailable(Exception):
    """Google's signing keys could not be fetched."""


class GoogleIdTokenVerifier:
    def __init__(self, client_factory: Optional[Callable[[], httpx.Client]] = None):
        self._client_factory = client_factory or (lambda: httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS))
        self._lock = threading.Lock()
        self._keys: dict = {}
        self._keys_expire_at = 0.0

    def _fetch_keys(self) -> None:
        try:
            with self._client_factory() as client:
                response = client.get(GOOGLE_CERTS_URL)
        except httpx.HTTPError as e:
            raise GoogleKeysUnavailable(f"Could not fetch Google signing keys: {type(e).__name__}") from None
        if response.status_code != 200:
            raise GoogleKeysUnavailable(f"Could not fetch Google signing keys: HTTP {response.status_code}")
        try:
            keys = {k["kid"]: k for k in response.json()["keys"]}
        except (ValueError, KeyError, TypeError):
            raise GoogleKeysUnavailable("Google signing keys response was not understood") from None
        match = re.search(r"max-age=(\d+)", response.headers.get("cache-control", ""))
        max_age = int(match.group(1)) if match else DEFAULT_KEYS_MAX_AGE
        self._keys = keys
        self._keys_expire_at = time.monotonic() + max_age

    def _get_key(self, kid: str) -> dict:
        with self._lock:
            if time.monotonic() >= self._keys_expire_at or kid not in self._keys:
                # Expired cache, or Google rotated keys since the last fetch
                self._fetch_keys()
            key = self._keys.get(kid)
        if key is None:
            raise GoogleTokenError("Google credential was signed with an unknown key")
        return key

    def verify(self, credential: str, client_id: str) -> dict:
        """Return the verified claims, or raise GoogleTokenError / GoogleKeysUnavailable."""
        try:
            header = jwt.get_unverified_header(credential)
        except JWTError:
            raise GoogleTokenError("Google credential is malformed") from None
        if header.get("alg") != "RS256" or not header.get("kid"):
            raise GoogleTokenError("Google credential is malformed")

        key = self._get_key(header["kid"])
        try:
            claims = jwt.decode(
                credential, key, algorithms=["RS256"], audience=client_id,
                options={"verify_at_hash": False},
            )
        except jwt.ExpiredSignatureError:
            raise GoogleTokenError("Google credential has expired") from None
        except JWTError:
            raise GoogleTokenError("Google credential could not be verified") from None

        if claims.get("iss") not in GOOGLE_ISSUERS:
            raise GoogleTokenError("Google credential has an invalid issuer")
        if not claims.get("sub") or not claims.get("email"):
            raise GoogleTokenError("Google credential is missing the account email")
        if claims.get("email_verified") not in (True, "true"):
            raise GoogleTokenError("Your Google account email is not verified")
        return claims


google_verifier = GoogleIdTokenVerifier()
