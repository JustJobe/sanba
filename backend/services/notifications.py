"""Transactional email notifications via Mailjet.

All senders swallow errors — a failed notification must never break
the operation that triggered it.
"""

import os
import logging
import threading
from datetime import datetime, timedelta

from mailjet_rest import Client

logger = logging.getLogger(__name__)

MAILJET_API_KEY = os.getenv("MAILJET_API_KEY")
MAILJET_API_SECRET = os.getenv("MAILJET_API_SECRET")
MAILJET_SENDER_EMAIL = os.getenv("MAILJET_SENDER_EMAIL", "noreply@sanba.my")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://sanba.my")

_mailjet = Client(auth=(MAILJET_API_KEY, MAILJET_API_SECRET), version="v3.1")

# Per-key cooldown so rapid successive completions don't spam one user
_last_sent: dict = {}
_lock = threading.Lock()


def _cooldown_ok(key: str, minutes: int = 10) -> bool:
    now = datetime.utcnow()
    with _lock:
        last = _last_sent.get(key)
        if last and now - last < timedelta(minutes=minutes):
            return False
        _last_sent[key] = now
        return True


def send_email(to_email: str, subject: str, text: str, html: str) -> bool:
    data = {
        "Messages": [
            {
                "From": {"Email": MAILJET_SENDER_EMAIL, "Name": "SanBa"},
                "To": [{"Email": to_email}],
                "Subject": subject,
                "TextPart": text,
                "HTMLPart": html,
            }
        ]
    }
    try:
        result = _mailjet.send.create(data=data)
        if result.status_code != 200:
            logger.warning(f"Mailjet send failed ({result.status_code}): {result.json()}")
            return False
        logger.info(f"Notification sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.warning(f"Mailjet exception sending to {to_email}: {e}")
        return False


def send_photos_ready(to_email: str, job_title: str, kind: str) -> None:
    """Notify the user that a job's AI operations have all finished.

    kind: "repair" | "remaster" — used for wording only.
    """
    if not _cooldown_ok(f"ready:{to_email}:{job_title}"):
        return
    verb = "repaired" if kind == "repair" else "remastered"
    subject = f"Your photo is ready — {job_title}"
    text = (
        f"Good news! \"{job_title}\" has been {verb} and is ready to view.\n\n"
        f"See the before & after: {FRONTEND_URL}\n\n— SanBa"
    )
    html = f"""
    <div style="font-family: monospace; color: #292524;">
      <h2 style="font-family: sans-serif;">Your photo is ready ✨</h2>
      <p>Good news! <strong>{job_title}</strong> has been {verb} and is ready to view.</p>
      <p style="margin: 24px 0;">
        <a href="{FRONTEND_URL}" style="background: #292524; color: #FDFBF7; padding: 12px 24px; text-decoration: none; font-weight: bold;">
          See the before &amp; after →
        </a>
      </p>
      <p style="color: #78716C; font-size: 12px;">— SanBa · Penang, Malaysia</p>
    </div>
    """
    send_email(to_email, subject, text, html)


def send_purge_reminder(to_email: str, job_titles: list, days_left: int, retention_days: int) -> None:
    """Warn the user that old jobs will be auto-deleted soon."""
    shown = job_titles[:5]
    more = len(job_titles) - len(shown)
    titles_text = "\n".join(f"  • {t}" for t in shown) + (f"\n  …and {more} more" if more > 0 else "")
    titles_html = "".join(f"<li>{t}</li>" for t in shown) + (f"<li>…and {more} more</li>" if more > 0 else "")

    subject = f"Reminder: {len(job_titles)} photo job{'s' if len(job_titles) != 1 else ''} will be deleted in {days_left} days"
    text = (
        f"As part of our privacy policy, photos are automatically deleted {retention_days} days after upload.\n\n"
        f"These jobs will be removed in about {days_left} days:\n{titles_text}\n\n"
        f"Download anything you want to keep: {FRONTEND_URL}\n"
        f"Our retention policy: {FRONTEND_URL}/privacy\n\n— SanBa"
    )
    html = f"""
    <div style="font-family: monospace; color: #292524;">
      <h2 style="font-family: sans-serif;">Scheduled photo deletion</h2>
      <p>As part of our <a href="{FRONTEND_URL}/privacy">privacy policy</a>, photos are automatically
         deleted {retention_days} days after upload.</p>
      <p>These jobs will be removed in about <strong>{days_left} days</strong>:</p>
      <ul>{titles_html}</ul>
      <p style="margin: 24px 0;">
        <a href="{FRONTEND_URL}" style="background: #292524; color: #FDFBF7; padding: 12px 24px; text-decoration: none; font-weight: bold;">
          Download your photos →
        </a>
      </p>
      <p style="color: #78716C; font-size: 12px;">— SanBa · Penang, Malaysia</p>
    </div>
    """
    send_email(to_email, subject, text, html)
