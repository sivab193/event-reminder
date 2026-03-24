import os
import json
import time
import datetime
import requests
import redis

redis_host = os.getenv('REDIS_HOST', 'localhost')
r = redis.Redis(host=redis_host, port=6379, db=0)

PORTAL_URL = "https://er.siv19.dev/dashboard"

def build_embed(bday):
    name = bday.get('name', 'Someone')
    association = bday.get('association') or bday.get('company', '')
    birthdate = bday.get('birthdate', '')
    event_type = bday.get('type', 'birthday')
    meet_date = bday.get('meetDate', '')
    unknown_year = bday.get('unknownYear', False)
    timezone = bday.get('timezone', '')

    event_label = event_type.capitalize() if event_type != 'birthday' else 'Birthday'

    # Age/duration
    age_text = ''
    if not unknown_year and birthdate:
        try:
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

    # Meet date
    meet_text = ''
    if meet_date:
        try:
            y, m, d = meet_date.split('-')
            if int(y) > 1900:
                meet_text = f"{d}/{m}/{y}"
        except Exception:
            pass

    fields = []
    if association:
        fields.append({"name": "Association", "value": association, "inline": True})
    fields.append({"name": "Date", "value": birthdate, "inline": True})
    if age_text:
        fields.append({"name": "Milestone", "value": age_text, "inline": True})
    if meet_text:
        fields.append({"name": "First Met", "value": meet_text, "inline": True})
    if timezone:
        fields.append({"name": "Timezone", "value": timezone, "inline": True})

    title = f"Today is {name}'s {event_label.lower()}!"
    if age_text:
        title += f" {age_text}"

    return {
        "content": f"🎉 **{event_label} Reminder**",
        "embeds": [{
            "title": f"{title} 🎉",
            "url": PORTAL_URL,
            "fields": fields,
            "color": 0x667eea,
            "footer": {"text": "Event Reminder • er.siv19.dev"}
        }]
    }

def send_discord(webhook_url, bday):
    message = build_embed(bday)
    try:
        resp = requests.post(webhook_url, json=message)
        resp.raise_for_status()
        print("Discord notification sent")
    except Exception as e:
        print(f"Discord Error: {e}")

if __name__ == "__main__":
    print("Discord worker listening...")
    while True:
        _, msg = r.brpop("discord_queue")
        data = json.loads(msg)

        user = data.get('user', {})
        bday = data.get('birthday', {})

        webhook_url = user.get('notifications', {}).get('discord', {}).get('webhookUrl')

        if webhook_url:
            send_discord(webhook_url, bday)
