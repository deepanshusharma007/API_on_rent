"""Check AIRent sign-in configuration (email codes, password reset, Google Sign-In).

Reads the same settings as the backend (environment variables, then the project .env).
Prints setting NAMES and status only — never secret values.

Usage (from the repository root):
    python scripts/check_auth_setup.py                       # offline status report
    python scripts/check_auth_setup.py --expect-sender leofi.labs@gmail.com
                                                             # also require this sender address
    python scripts/check_auth_setup.py --verify-account --expect-sender leofi.labs@gmail.com
                                                             # ask Google which account the Gmail token
                                                             # belongs to (network, sends NO email)
    python scripts/check_auth_setup.py --send-test-email you@example.com
                                                             # sends ONE real email via the configured transport
Add --email-only to leave Google Sign-In out of the verdict.
Exit code: 0 when everything checked is ready, 1 otherwise.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"


def verify_gmail_account(transport, expected_sender):
    """Refresh the Gmail API access token and ask Google which account and scopes it has.
    Sends no email. Returns (ok, [messages]); messages never contain credentials."""
    from backend.services.email_transport import GmailApiError
    try:
        with transport._client_factory() as client:
            token = transport._get_token(client)
            response = client.get(TOKENINFO_URL, params={"access_token": token})
    except GmailApiError as e:
        hint = " -> the refresh token is wrong, revoked or expired; create a new one" if "invalid_grant" in str(e) else ""
        return False, [f"[FAILED] {e}{hint}"]
    except Exception as e:
        return False, [f"[FAILED] could not reach Google: {type(e).__name__}"]
    if response.status_code != 200:
        return False, [f"[FAILED] token info request returned HTTP {response.status_code}"]

    info = response.json()
    scopes = info.get("scope", "").split()
    account = (info.get("email") or "").lower()
    ok, messages = True, []
    if GMAIL_SEND_SCOPE in scopes:
        messages.append("[OK] token can send mail (gmail.send scope granted)")
    else:
        ok = False
        messages.append("[PROBLEM] token is missing the gmail.send scope")
    if not account:
        messages.append("[WARN] token doesn't reveal its account (add the 'email' scope when creating it to verify)")
        ok = False
    elif expected_sender and account != expected_sender.lower():
        ok = False
        messages.append(f"[PROBLEM] token belongs to {account}, expected {expected_sender}")
    else:
        messages.append(f"[OK] token belongs to {account}")
    if account and transport.sender.lower() != account:
        ok = False
        messages.append(f"[PROBLEM] GMAIL_SENDER ({transport.sender}) differs from the token's account ({account})")
    return ok, messages


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--send-test-email", metavar="ADDRESS", help="send one real test email to ADDRESS")
    parser.add_argument("--expect-sender", metavar="ADDRESS", help="require this sender address")
    parser.add_argument("--verify-account", action="store_true",
                        help="ask Google which account the Gmail token belongs to (network; sends no email)")
    parser.add_argument("--email-only", action="store_true", help="check email only (skip Google Sign-In)")
    args = parser.parse_args()

    from backend.config import settings
    from backend.services.email_service import email_service

    ok = True
    print("AIRent sign-in setup check")
    print(f"  ENVIRONMENT  = {settings.ENVIRONMENT}")
    print(f"  FRONTEND_URL = {settings.FRONTEND_URL}   (password-reset links point here)")
    if settings.ENVIRONMENT == "production" and "localhost" in settings.FRONTEND_URL:
        print("  [PROBLEM] FRONTEND_URL is localhost in production; set it to the public site URL")
        ok = False

    status = email_service.status()
    print(f"\nEmail (signup codes, password reset): EMAIL_TRANSPORT={status['transport']}")
    if status["enabled"]:
        print(f"  [OK] configured, sending as {status['sender']}")
        if status["transport"] == "smtp" and settings.ENVIRONMENT == "production":
            print("  [WARN] Render free web services block SMTP ports 25/465/587; use EMAIL_TRANSPORT=gmail_api there")
    else:
        print(f"  [MISSING] {', '.join(status['missing'])}")
        ok = False
    if args.expect_sender:
        configured = (email_service.from_email or "").lower()
        if status["enabled"] and configured == args.expect_sender.lower():
            print(f"  [OK] sender matches {args.expect_sender}")
        else:
            print(f"  [PROBLEM] sender is {configured or 'not set'}, expected {args.expect_sender}")
            ok = False
    if args.verify_account:
        if status["transport"] != "gmail_api" or not status["enabled"]:
            print("  [SKIPPED] --verify-account needs EMAIL_TRANSPORT=gmail_api with all GMAIL_* settings")
            ok = False
        else:
            account_ok, messages = verify_gmail_account(email_service.gmail, args.expect_sender)
            for line in messages:
                print(f"  {line}")
            ok = ok and account_ok

    print("\nGoogle Sign-In:")
    client_id = settings.GOOGLE_CLIENT_ID
    if args.email_only:
        print("  [SKIPPED] --email-only")
    elif not client_id:
        print("  [MISSING] GOOGLE_CLIENT_ID")
        ok = False
    elif not client_id.endswith(".apps.googleusercontent.com"):
        print("  [PROBLEM] GOOGLE_CLIENT_ID does not look like a Web OAuth client ID (…apps.googleusercontent.com)")
        ok = False
    else:
        print(f"  [OK] GOOGLE_CLIENT_ID set ({client_id[:12]}…). Frontend gets it from GET /auth/config.")
        print(f"       Authorised JavaScript origins must include {settings.FRONTEND_URL.rstrip('/')}"
              " (and http://localhost + http://localhost:5173 for local testing).")

    if args.send_test_email:
        print(f"\nSending one test email to {args.send_test_email} …")
        if not status["enabled"]:
            print("  [SKIPPED] email is not configured")
            ok = False
        else:
            sent = email_service._send(
                args.send_test_email, "AIRent email setup test",
                "<p>This is a test from <strong>scripts/check_auth_setup.py</strong>. "
                "If you can read it, signup codes and password-reset emails will be delivered.</p>",
            )
            print("  [OK] sent — check the inbox (and spam)" if sent else "  [FAILED] see the error logged above")
            ok = ok and sent

    print("\nResult:", "READY" if ok else "NOT READY — fix the items above")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
