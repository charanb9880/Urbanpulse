"""
UrbanPulse AI — Notification Service
Handles real email (Brevo SMTP relay) and SMS (Twilio) delivery for:
  - Password reset OTP
  - Signup verification OTP
  - Welcome emails
  - Incident alert fan-out to citizens
  - Status update notifications to incident reporters
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ── Config ──────────────────────────────────────────────────────
# Brevo SMTP relay (formerly Sendinblue)
# Server: smtp-relay.brevo.com  Port: 587  TLS: STARTTLS
# Login: your Brevo account email  Password: Brevo SMTP key
SMTP_SERVER   = os.getenv("SMTP_SERVER", "smtp-relay.brevo.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

TWILIO_SID    = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_TOKEN  = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM   = os.getenv("TWILIO_PHONE_NUMBER", "")

APP_NAME  = "UrbanPulse AI"
APP_COLOR = "#4f46e5"  # indigo-600


# ══════════════════════════════════════════════════════════════════
#  HTML Email Templates
# ══════════════════════════════════════════════════════════════════

def _base_html(title: str, body_html: str) -> str:
    """Minimal but premium-looking HTML email wrapper."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    body {{ margin:0; padding:0; background:#f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }}
    .container {{ max-width:560px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }}
    .header {{ background:{APP_COLOR}; padding:32px 40px; text-align:center; }}
    .header img {{ width:40px; height:40px; margin-bottom:10px; }}
    .header h1 {{ color:#fff; margin:0; font-size:22px; font-weight:700; letter-spacing:-0.5px; }}
    .header p {{ color:rgba(255,255,255,0.8); margin:6px 0 0; font-size:13px; }}
    .body {{ padding:40px; }}
    .otp-box {{ background:#f8faff; border:2px dashed {APP_COLOR}; border-radius:12px; text-align:center; padding:24px; margin:24px 0; }}
    .otp-code {{ font-size:42px; font-weight:800; letter-spacing:10px; color:{APP_COLOR}; font-variant-numeric:tabular-nums; }}
    .otp-sub {{ color:#64748b; font-size:13px; margin-top:8px; }}
    .alert-box {{ background:#fef3c7; border-left:4px solid #f59e0b; border-radius:8px; padding:16px 20px; margin:20px 0; }}
    .alert-box.critical {{ background:#fee2e2; border-color:#ef4444; }}
    .alert-box.high {{ background:#fef3c7; border-color:#f59e0b; }}
    .alert-box.info {{ background:#e0f2fe; border-color:#0ea5e9; }}
    .badge {{ display:inline-block; padding:4px 12px; border-radius:99px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }}
    .badge-critical {{ background:#fee2e2; color:#ef4444; }}
    .badge-high {{ background:#fef3c7; color:#d97706; }}
    .badge-medium {{ background:#e0f2fe; color:#0284c7; }}
    .badge-low {{ background:#dcfce7; color:#16a34a; }}
    .btn {{ display:block; text-align:center; background:{APP_COLOR}; color:#fff; text-decoration:none; padding:14px 32px; border-radius:99px; font-weight:600; margin:24px auto; width:fit-content; }}
    .footer {{ background:#f8fafc; padding:24px 40px; text-align:center; color:#94a3b8; font-size:12px; border-top:1px solid #e2e8f0; }}
    h2 {{ color:#0f172a; font-size:20px; margin:0 0 12px; }}
    p {{ color:#475569; line-height:1.6; margin:0 0 12px; }}
    .label {{ font-weight:600; color:#0f172a; }}
    table.info {{ width:100%; border-collapse:collapse; margin:16px 0; }}
    table.info td {{ padding:10px 14px; border-bottom:1px solid #f1f5f9; color:#475569; font-size:14px; }}
    table.info td:first-child {{ font-weight:600; color:#0f172a; width:35%; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏙️ {APP_NAME}</h1>
      <p>The Living Intelligence of Bengaluru</p>
    </div>
    <div class="body">
      {body_html}
    </div>
    <div class="footer">
      <p>© 2026 UrbanPulse AI — Bengaluru Smart City Initiative</p>
      <p>You're receiving this because you're registered as a citizen on UrbanPulse AI.</p>
    </div>
  </div>
</body>
</html>"""


def _otp_email_html(name: str, otp: str, purpose: str = "password reset") -> str:
    body = f"""
      <h2>Hello, {name}! 👋</h2>
      <p>You requested a verification code for your <strong>{purpose}</strong> on UrbanPulse AI. Use the code below:</p>
      <div class="otp-box">
        <div class="otp-code">{otp}</div>
        <div class="otp-sub">⏱️ Valid for <strong>10 minutes</strong> · Do not share this code</div>
      </div>
      <p>If you didn't request this, you can safely ignore this email. Your account is secure.</p>
    """
    return _base_html(f"Your {purpose.title()} Code — {APP_NAME}", body)


def _welcome_email_html(name: str, role: str) -> str:
    role_label = role.capitalize()
    role_desc = {
        "citizen": "report incidents, track your city in real-time, and receive live alerts",
        "authority": "manage incidents, run simulations, and access the command center",
    }.get(role, "access the UrbanPulse platform")
    body = f"""
      <h2>Welcome aboard, {name}! 🎉</h2>
      <p>Your <strong>{role_label}</strong> account on UrbanPulse AI is now active. You can now {role_desc}.</p>
      <table class="info">
        <tr><td>Account Role</td><td>{role_label}</td></tr>
        <tr><td>Platform</td><td>UrbanPulse AI — Bengaluru</td></tr>
        <tr><td>Status</td><td>✅ Active</td></tr>
      </table>
      <a class="btn" href="http://localhost:3000/auth?role={role}">Open UrbanPulse Dashboard →</a>
      <p style="color:#94a3b8; font-size:12px;">You'll receive live city alerts including incident reports, traffic updates, and emergency notifications based on your profile.</p>
    """
    return _base_html(f"Welcome to {APP_NAME}!", body)


def _incident_alert_html(incident: dict) -> str:
    severity = incident.get("severity", "Medium")
    sev_class = {
        "Critical": "critical", "High": "high"
    }.get(severity, "info")
    badge_class = {
        "Critical": "badge-critical", "High": "badge-high",
        "Medium": "badge-medium", "Low": "badge-low"
    }.get(severity, "badge-medium")
    emoji = {"Critical": "🚨", "High": "⚠️", "Medium": "ℹ️", "Low": "✅"}.get(severity, "ℹ️")

    body = f"""
      <h2>{emoji} New Incident Alert</h2>
      <p>A new incident has been reported in <strong>Bengaluru</strong> that may affect you.</p>
      <div class="alert-box {sev_class}">
        <span class="badge {badge_class}">{severity} Severity</span>
        <p style="margin:8px 0 0; font-weight:600; color:#0f172a;">{incident.get('title', 'Urban Incident')}</p>
      </div>
      <table class="info">
        <tr><td>Category</td><td>{incident.get('category', 'General')}</td></tr>
        <tr><td>Location</td><td>{incident.get('location', 'Bengaluru')}</td></tr>
        <tr><td>Status</td><td>{incident.get('status', 'Reported')}</td></tr>
        <tr><td>Reported At</td><td>{incident.get('created_at', '')[:16].replace('T', ' ')} UTC</td></tr>
      </table>
      <p><span class="label">Details:</span> {incident.get('description', '')}</p>
      <a class="btn" href="http://localhost:3000/citizen">View Live Map →</a>
    """
    return _base_html(f"{emoji} City Alert: {incident.get('title', 'New Incident')} — {APP_NAME}", body)


def _status_update_html(name: str, incident: dict) -> str:
    status = incident.get("status", "Updated")
    emoji = {
        "Verified": "✅", "Resolved": "🟢", "Under Review": "🔍",
        "Rejected": "❌", "In Progress": "🔧"
    }.get(status, "📢")
    body = f"""
      <h2>Hello, {name}!</h2>
      <p>There's an update on an incident you reported on UrbanPulse AI:</p>
      <table class="info">
        <tr><td>Incident</td><td>{incident.get('title', 'Your Report')}</td></tr>
        <tr><td>Location</td><td>{incident.get('location', 'Bengaluru')}</td></tr>
        <tr><td>New Status</td><td>{emoji} <strong>{status}</strong></td></tr>
        <tr><td>Updated At</td><td>{incident.get('updated_at', '')[:16].replace('T', ' ')} UTC</td></tr>
      </table>
      <a class="btn" href="http://localhost:3000/citizen">View Details →</a>
    """
    return _base_html(f"{emoji} Incident Update — {APP_NAME}", body)


# ══════════════════════════════════════════════════════════════════
#  Core Delivery Functions
# ══════════════════════════════════════════════════════════════════

def send_email(to_email: str, subject: str, html_body: str, text_fallback: str = "") -> bool:
    """Send HTML email via Brevo SMTP relay. Returns True on success."""
    # Read at call time so server restarts aren't needed after .env changes
    smtp_server   = os.getenv("SMTP_SERVER", "smtp-relay.brevo.com")
    smtp_port     = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")

    if not smtp_username or not smtp_password:
        print(f"[EMAIL MOCK] To: {to_email} | Subject: {subject}")
        if text_fallback:
            print(f"  Body: {text_fallback[:120]}...")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["From"]    = f"{APP_NAME} <{smtp_username}>"
        msg["To"]      = to_email
        msg["Subject"] = subject

        if text_fallback:
            msg.attach(MIMEText(text_fallback, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_server, smtp_port) as server:
                server.login(smtp_username, smtp_password)
                server.sendmail(smtp_username, to_email, msg.as_string())
        else:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_username, smtp_password)
                server.sendmail(smtp_username, to_email, msg.as_string())

        print(f"[EMAIL ✓] Sent to {to_email}: {subject}")
        return True
    except Exception as e:
        print(f"[EMAIL ✗] Failed to {to_email}: {e}")
        return False


def send_sms(to_phone: str, message: str) -> bool:
    """Send SMS via Twilio SDK. Returns True on success."""
    twilio_sid   = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_token = os.getenv("TWILIO_AUTH_TOKEN", "")
    twilio_from  = os.getenv("TWILIO_PHONE_NUMBER", "")

    if not (twilio_sid and twilio_token and twilio_from):
        print(f"[SMS MOCK] To: {to_phone} | {message[:80]}")
        return False

    try:
        from twilio.rest import Client
        client = Client(twilio_sid, twilio_token)
        msg = client.messages.create(body=message, from_=twilio_from, to=to_phone)
        print(f"[SMS ✓] Sent to {to_phone} (SID: {msg.sid})")
        return True
    except Exception as e:
        print(f"[SMS ✗] Failed to {to_phone}: {e}")
        return False



# ══════════════════════════════════════════════════════════════════
#  High-Level Notification Functions
# ══════════════════════════════════════════════════════════════════

def send_otp(to_email: str, name: str, otp: str, purpose: str = "password reset") -> dict:
    """Send OTP code via email + SMS (if phone provided separately)."""
    subject = f"🔑 Your UrbanPulse Verification Code: {otp}"
    html    = _otp_email_html(name, otp, purpose)
    text    = f"Hello {name},\n\nYour UrbanPulse {purpose} verification code is: {otp}\n\nExpires in 10 minutes. Do not share this code.\n\n— {APP_NAME}"
    email_ok = send_email(to_email, subject, html, text)
    return {"email_delivered": email_ok}


def send_otp_with_sms(to_email: str, to_phone: str | None, name: str, otp: str, purpose: str = "password reset") -> dict:
    """Send OTP via email and optionally SMS."""
    result = send_otp(to_email, name, otp, purpose)
    sms_ok = False
    if to_phone:
        sms_msg = f"UrbanPulse {purpose} OTP: {otp}. Valid 10 min. Don't share."
        sms_ok = send_sms(to_phone, sms_msg)
    result["sms_delivered"] = sms_ok
    return result


def send_welcome(to_email: str, name: str, role: str) -> bool:
    """Send welcome email after successful signup."""
    subject = f"🏙️ Welcome to UrbanPulse AI, {name}!"
    html    = _welcome_email_html(name, role)
    text    = f"Welcome {name}!\n\nYour {role} account on UrbanPulse AI is now active. Log in at http://localhost:3000/auth\n\n— {APP_NAME}"
    return send_email(to_email, subject, html, text)


def send_incident_alert_to_citizen(to_email: str, to_phone: str | None, incident: dict) -> dict:
    """Send incident alert email + SMS to a citizen."""
    severity = incident.get("severity", "Medium")
    emoji    = {"Critical": "🚨", "High": "⚠️", "Medium": "ℹ️", "Low": "✅"}.get(severity, "ℹ️")
    subject  = f"{emoji} City Alert: {incident.get('title', 'New Incident')} [{severity}]"
    html     = _incident_alert_html(incident)
    text     = (
        f"{emoji} UrbanPulse City Alert\n"
        f"Incident: {incident.get('title')}\n"
        f"Location: {incident.get('location')}\n"
        f"Severity: {severity}\n"
        f"Details: {incident.get('description', '')[:100]}\n"
        f"Track live: http://localhost:3000/citizen"
    )
    email_ok = send_email(to_email, subject, html, text)
    sms_ok   = False
    if to_phone and severity in ("Critical", "High"):
        sms_msg = (
            f"UrbanPulse {emoji} {severity} Alert: "
            f"{incident.get('title')} at {incident.get('location')}. "
            f"Check the app for details."
        )
        sms_ok = send_sms(to_phone, sms_msg)
    return {"email_delivered": email_ok, "sms_delivered": sms_ok}


def send_status_update(to_email: str, to_phone: str | None, name: str, incident: dict) -> dict:
    """Notify a citizen that their reported incident's status changed."""
    status  = incident.get("status", "Updated")
    emoji   = {"Verified": "✅", "Resolved": "🟢", "Under Review": "🔍", "Rejected": "❌"}.get(status, "📢")
    subject = f"{emoji} Your Incident Report Has Been Updated"
    html    = _status_update_html(name, incident)
    text    = (
        f"Hello {name},\n\n"
        f"Your incident '{incident.get('title')}' at {incident.get('location')} "
        f"has been updated to: {status}\n\n"
        f"Check the app for details: http://localhost:3000/citizen\n\n— {APP_NAME}"
    )
    email_ok = send_email(to_email, subject, html, text)
    sms_ok   = False
    if to_phone:
        sms_msg = f"UrbanPulse: Your report '{incident.get('title')}' status → {status}. Check the app."
        sms_ok  = send_sms(to_phone, sms_msg)
    return {"email_delivered": email_ok, "sms_delivered": sms_ok}


# ── Legacy compatibility wrappers ──────────────────────────────
def send_real_email(to_email: str, subject: str, message_body: str) -> bool:
    """Legacy wrapper — sends plain-text email."""
    return send_email(to_email, subject, f"<pre>{message_body}</pre>", message_body)


def send_real_sms(to_phone: str, message: str) -> bool:
    """Legacy wrapper — sends SMS."""
    return send_sms(to_phone, message)
