import os
import json
import time
import datetime
import requests
import redis

redis_host = os.getenv('REDIS_HOST', 'localhost')
r = redis.Redis(host=redis_host, port=6379, db=0)

BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
PORTAL_URL = "https://er.siv19.dev/dashboard"

def build_message(bday):
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

    lines = [
        f"🎉 *{event_label} Reminder*",
        "",
        f"Today is *{name}*'s {event_label.lower()}!{f' {age_text}' if age_text else ''}",
    ]
    if association:
        lines.append(f"🏢 Association: {association}")
    lines.append(f"📅 Date: {birthdate}")
    if meet_text:
        lines.append(f"🤝 First met: {meet_text}")
    if timezone:
        lines.append(f"🌍 Timezone: {timezone}")
    lines.extend(["", f"🔗 [Open Dashboard]({PORTAL_URL})"])

    return '\n'.join(lines)

def send_telegram(chat_id, text):
    if not BOT_TOKEN:
        print("Missing TELEGRAM_BOT_TOKEN")
        return
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}
    try:
        resp = requests.post(url, json=payload)
        resp.raise_for_status()
        print(f"Telegram sent to {chat_id}")
    except Exception as e:
        print(f"Telegram Error: {e}")

if __name__ == "__main__":
    print("Telegram worker listening...")
    while True:
        _, msg = r.brpop("telegram_queue")
        data = json.loads(msg)

        user = data.get('user', {})
        bday = data.get('birthday', {})

        chat_id = user.get('notifications', {}).get('telegram', {}).get('chatId')

        if chat_id:
            text = build_message(bday)
            send_telegram(chat_id, text)
