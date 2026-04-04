import os
import json
import time
import redis
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import firebase_admin
from firebase_admin import credentials, firestore
from shared.utils import compute_age_text, format_meet_date, get_event_label, get_portal_url

redis_host = os.getenv('REDIS_HOST', 'localhost')
r = redis.Redis(host=redis_host, port=6379, db=0)

# Initialize Firebase
cred_path = os.getenv('FIREBASE_CREDENTIALS', '/app/serviceAccountKey.json')
if os.path.exists(cred_path):
    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
    except Exception as e:
        print(f"Firebase initialization error: {e}")
        db = None
else:
    print(f"Firebase credentials not found at {cred_path}")
    db = None

# SMTP Config
SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USER = os.getenv('SMTP_USER', '')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
SMTP_SSL = os.getenv('SMTP_SSL', 'false').lower() in ('true', '1', 'yes')
SMTP_FROM = os.getenv('SMTP_FROM', SMTP_USER)

PORTAL_URL = get_portal_url()

def send_verification_email(to_email, code, job_id):
    """Send verification code email."""
    if not SMTP_USER or not SMTP_PASSWORD:
        print("Missing SMTP credentials (SMTP_USER or SMTP_PASSWORD)")
        return False

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
      <head><meta charset="UTF-8"><title>Event Reminder - Verification</title></head>
      <body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width:600px; margin:0 auto; background:#fff;">
          <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); padding:40px 20px; text-align:center;">
            <h1 style="color:#fff; margin:0; font-size:28px;">🔐 Event Reminder</h1>
          </div>
          <div style="padding:40px 30px;">
            <p style="color:#374151; font-size:16px;">Your email verification code is:</p>
            <div style="background:#f3f4f6; border-radius:12px; padding:24px; margin:24px 0; text-align:center; border:2px solid #667eea;">
              <div style="font-size:48px; font-weight:bold; letter-spacing:8px; color:#667eea; font-family:monospace;">{code}</div>
            </div>
            <p style="color:#6b7280; font-size:14px; text-align:center;">This code will expire in 15 minutes.</p>
            <p style="color:#374151; font-size:16px; margin-top:24px;">Enter this code in the Event Reminder app to verify your email.</p>
          </div>
          <div style="background:#f9fafb; padding:20px 30px; border-top:1px solid #e5e7eb; text-align:center;">
            <p style="color:#6b7280; font-size:14px; margin:0;">Sent by <a href="{PORTAL_URL}" style="color:#667eea; text-decoration:none; font-weight:500;">Event Reminder</a></p>
          </div>
        </div>
      </body>
    </html>
    """

    msg = MIMEMultipart()
    msg['From'] = SMTP_FROM
    msg['To'] = to_email
    msg['Subject'] = f"Event Reminder Verification Code: {code}"
    msg.attach(MIMEText(html, 'html'))

    try:
        if SMTP_SSL:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
            server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"✓ Verification email sent to {to_email} (job_id: {job_id})")
        return True
    except Exception as e:
        print(f"✗ SMTP Error sending verification email: {e}")
        return False

def send_email(to_email, bday, user):
    if not SMTP_USER or not SMTP_PASSWORD:
        print("Missing SMTP credentials (SMTP_USER or SMTP_PASSWORD)")
        return

    name = bday.get('name', 'Someone')
    association = bday.get('association') or bday.get('company', '')
    birthdate = bday.get('birthdate', '')
    event_type = bday.get('type', 'birthday')
    meet_date = bday.get('meetDate', '')
    unknown_year = bday.get('unknownYear', False)
    timezone = bday.get('timezone', '')

    age_text = compute_age_text(birthdate, event_type, unknown_year) or ''
    meet_text = format_meet_date(meet_date) or ''
    event_label = get_event_label(event_type)

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
      <head><meta charset="UTF-8"><title>Event Reminder</title></head>
      <body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width:600px; margin:0 auto; background:#fff;">
          <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); padding:40px 20px; text-align:center;">
            <h1 style="color:#fff; margin:0; font-size:28px;">🎉 {event_label} Reminder</h1>
          </div>
          <div style="padding:40px 30px;">
            <p style="color:#374151; font-size:16px;">Today is <strong>{name}</strong>'s {event_label.lower()}!{f' <strong>{age_text}</strong>' if age_text else ''}</p>
            <div style="background:#f3f4f6; border-radius:12px; padding:24px; margin:24px 0; border-left:4px solid #667eea;">
              <div><span style="color:#6b7280; font-size:14px;">Name:</span><div style="color:#111827; font-size:18px; font-weight:600; margin-top:4px;">{name}</div></div>
              {'<div style="margin-top:12px;"><span style="color:#6b7280; font-size:14px;">Association:</span><div style="color:#111827; font-size:16px; margin-top:4px;">' + association + '</div></div>' if association else ''}
              <div style="margin-top:12px;"><span style="color:#6b7280; font-size:14px;">Date:</span><div style="color:#111827; font-size:16px; margin-top:4px;">{birthdate}</div></div>
              {'<div style="margin-top:12px;"><span style="color:#6b7280; font-size:14px;">First met:</span><div style="color:#111827; font-size:16px; margin-top:4px;">' + meet_text + '</div></div>' if meet_text else ''}
              {'<div style="margin-top:12px;"><span style="color:#6b7280; font-size:14px;">Timezone:</span><div style="color:#111827; font-size:16px; margin-top:4px;">' + timezone + '</div></div>' if timezone else ''}
            </div>
            <p style="color:#374151; font-size:16px;">Don't forget to reach out and make the day special! 🎉</p>
          </div>
          <div style="background:#f9fafb; padding:20px 30px; border-top:1px solid #e5e7eb; text-align:center;">
            <p style="color:#6b7280; font-size:14px; margin:0;">Sent by <a href="{PORTAL_URL}" style="color:#667eea; text-decoration:none; font-weight:500;">Event Reminder</a> &bull; <a href="{PORTAL_URL}" style="color:#667eea; text-decoration:none;">er.siv19.dev</a></p>
          </div>
        </div>
      </body>
    </html>
    """

    subject = f"🎉 {event_label} Reminder: {name}"
    if age_text:
        subject += f" — {age_text}"

    msg = MIMEMultipart()
    msg['From'] = SMTP_FROM
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(html, 'html'))

    try:
        if SMTP_SSL:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
            server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"Email sent via SMTP to {to_email}")
    except Exception as e:
        print(f"SMTP Error: {e}")

if __name__ == "__main__":
    print(f"Email worker listening on {redis_host}...")
    print(f"Processing queues: email_queue, email_verification_queue")
    
    while True:
        try:
            # Use BRPOP with timeout to listen to multiple queues
            # Priority: check verification queue first, then birthday queue
            queue_name, raw = r.brpop(["email_verification_queue", "email_queue"], timeout=1)
            
            if queue_name is None:
                continue
            
            data = json.loads(raw)
            
            # Handle verification email jobs
            if queue_name == b"email_verification_queue":
                to_email = data.get('identifier')
                code = data.get('code')
                job_id = data.get('id')
                
                if to_email and code:
                    success = send_verification_email(to_email, code, job_id)
                    
                    # Update job status in Firestore
                    if db and job_id:
                        try:
                            db.collection('email_jobs').document(job_id).update({
                                'status': 'sent' if success else 'failed'
                            })
                        except Exception as e:
                            print(f"Error updating job status: {e}")
            
            # Handle birthday reminder emails
            else:
                user = data.get('user', {})
                bday = data.get('birthday', {})
                
                to_email = user.get('notifications', {}).get('email', {}).get('address')
                if not to_email:
                    to_email = user.get('email')

                if to_email:
                    send_email(to_email, bday, user)
                    
        except Exception as e:
            print(f"Worker Loop Error: {e}")
            time.sleep(1)
