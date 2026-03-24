import os
import json
import time
import resend
import redis

redis_host = os.getenv('REDIS_HOST', 'localhost')
r = redis.Redis(host=redis_host, port=6379, db=0)

resend.api_key = os.getenv('RESEND_API_KEY')

PORTAL_URL = "https://er.siv19.dev/dashboard"

def send_email(email, bday, user):
    if not resend.api_key:
        print("Missing RESEND_API_KEY")
        return

    name = bday.get('name', 'Someone')
    association = bday.get('association') or bday.get('company', '')
    birthdate = bday.get('birthdate', '')
    event_type = bday.get('type', 'birthday')
    meet_date = bday.get('meetDate', '')
    unknown_year = bday.get('unknownYear', False)
    timezone = bday.get('timezone', '')

    # Compute age/duration
    age_text = ''
    if not unknown_year and birthdate:
        try:
            import datetime
            b_year = int(birthdate.split('-')[0])
            age = datetime.datetime.now().year - b_year
            if age > 0:
                if event_type == 'anniversary':
                    age_text = f"{age} {'year' if age == 1 else 'years'} together 💍"
                elif event_type == 'birthday':
                    age_text = f"Turning {age} 🎂"
                else:
                    age_text = f"{age} {'year' if age == 1 else 'years'} ago"
        except Exception:
            pass

    # Format meet date
    meet_text = ''
    if meet_date:
        try:
            y, m, d = meet_date.split('-')
            if int(y) > 1900:
                meet_text = f"{d}/{m}/{y}"
        except Exception:
            pass

    event_label = event_type.capitalize() if event_type != 'birthday' else 'Birthday'

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

    try:
        r = resend.Emails.send({
            "from": os.getenv('FROM_EMAIL', 'onboarding@resend.dev'),
            "to": email,
            "subject": subject,
            "html": html
        })
        print(f"Email sent to {email}")
    except Exception as e:
        print(f"Email Error: {e}")

if __name__ == "__main__":
    print("Email worker listening...")
    while True:
        _, msg = r.brpop("email_queue")
        data = json.loads(msg)

        user = data.get('user', {})
        bday = data.get('birthday', {})

        email = user.get('notifications', {}).get('email', {}).get('address')
        if not email:
            email = user.get('email')

        if email:
            send_email(email, bday, user)
