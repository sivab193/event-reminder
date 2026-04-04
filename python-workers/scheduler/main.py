import os
import json
import time
import datetime
import re
from zoneinfo import ZoneInfo
import redis
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

# Connect to Redis
redis_host = os.getenv('REDIS_HOST', 'localhost')
r = redis.Redis(host=redis_host, port=6379, db=0)

# Initialize Firebase
cred_path = os.getenv('FIREBASE_CREDENTIALS', 'serviceAccountKey.json')
if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
else:
    print(f"Warning: Firebase credentials not found at {cred_path}. Using mock mode.")
    db = None

# Check interval in seconds (run every 60s to hit 5-minute timing windows)
CHECK_INTERVAL = int(os.getenv('CHECK_INTERVAL', '60'))


def parse_timing_offset(timing):
    """
    Parse user's reminderTiming preset into a timedelta offset from midnight.
    Supported values: 'midnight', '-15m', '+15m', '+1h', '+6h', '+10h'
    """
    if not timing or timing == 'midnight':
        return datetime.timedelta(0)

    match = re.match(r'^([+-]?)(\d+)([mhd])$', timing)
    if not match:
        return datetime.timedelta(0)

    sign = -1 if match.group(1) == '-' else 1
    value = int(match.group(2))
    unit = match.group(3)

    if unit == 'm':
        return datetime.timedelta(minutes=sign * value)
    elif unit == 'h':
        return datetime.timedelta(hours=sign * value)
    elif unit == 'd':
        return datetime.timedelta(days=sign * value)

    return datetime.timedelta(0)


def get_today_in_timezone(tz_name):
    """Get today's date in the given IANA timezone."""
    try:
        tz = ZoneInfo(tz_name)
    except (KeyError, Exception):
        tz = ZoneInfo('UTC')
    return datetime.datetime.now(tz).date()


def get_midnight_in_timezone(tz_name):
    """Get midnight (start of today) as a UTC-aware datetime for the given timezone."""
    try:
        tz = ZoneInfo(tz_name)
    except (KeyError, Exception):
        tz = ZoneInfo('UTC')
    now = datetime.datetime.now(tz)
    midnight_local = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return midnight_local.astimezone(ZoneInfo('UTC'))


def mark_as_sent(user_id, birthday_id, date_str):
    """Mark this reminder as sent with a 24h TTL using atomic Redis SET NX."""
    key = f"sent:{user_id}:{birthday_id}:{date_str}"
    return r.set(key, "1", nx=True, ex=86400)


def is_already_sent(user_id, birthday_id, date_str):
    """Check if this reminder was already sent today (idempotency via Redis)."""
    key = f"sent:{user_id}:{birthday_id}:{date_str}"
    return r.exists(key)


def check_birthdays():
    print(f"[{datetime.datetime.utcnow().isoformat()}] Checking birthdays...")
    if not db:
        print("Mock mode: pushing mock events to queues.")
        mock_payload = json.dumps({"userId": "123", "name": "John Doe", "email": "test@example.com"})
        r.lpush("email_queue", mock_payload)
        r.lpush("telegram_queue", mock_payload)
        r.lpush("discord_queue", mock_payload)
        return

    now_utc = datetime.datetime.now(ZoneInfo('UTC'))

    users_ref = db.collection('users')
    users = users_ref.stream()

    for user_doc in users:
        user = user_doc.to_dict()
        user_id = user_doc.id  # Use document ID, not user.get('userId')
        notifications = user.get('notifications', {})

        # Parse the user's global reminder timing preference
        global_timing = notifications.get('reminderTiming', 'midnight')
        offset = parse_timing_offset(global_timing)

        birthdays_ref = db.collection('birthdays').where('userId', '==', user_id).stream()
        for bday_doc in birthdays_ref:
            bday = bday_doc.to_dict()
            birthday_id = bday_doc.id
            try:
                birthdate = bday.get('birthdate', '')
                if not birthdate:
                    continue

                b_year, b_month, b_day = map(int, birthdate.split('-'))

                # Use the event's timezone to determine "today"
                event_tz = bday.get('timezone', 'UTC') or 'UTC'
                today = get_today_in_timezone(event_tz)

                # Check if today's month/day matches the event
                if today.month != b_month or today.day != b_day:
                    continue

                # Calculate the target dispatch time: midnight in event tz + user's timing offset
                midnight_utc = get_midnight_in_timezone(event_tz)
                target_time = midnight_utc + offset

                # Check if 'now' is within a 5-minute window of the target time
                window_start = target_time
                window_end = target_time + datetime.timedelta(minutes=5)

                if not (window_start <= now_utc < window_end):
                    continue

                # Idempotency check: atomically reserve a send slot for this user/event/day
                date_key = today.isoformat()
                if not mark_as_sent(user_id, birthday_id, date_key):
                    continue

                # Dispatch to queues based on enabled channels
                payload = json.dumps({
                    "userId": user_id,
                    "birthday": bday,
                    "user": user
                })

                dispatched = False
                if notifications.get('email', {}).get('enabled'):
                    r.lpush("email_queue", payload)
                    dispatched = True
                if notifications.get('telegram', {}).get('enabled'):
                    r.lpush("telegram_queue", payload)
                    dispatched = True
                if notifications.get('discord', {}).get('enabled'):
                    r.lpush("discord_queue", payload)
                    dispatched = True

                if dispatched:
                    mark_as_sent(user_id, birthday_id, date_key)
                    print(f"  ✓ Dispatched: {bday.get('name', '?')} for user {user.get('email', user_id)} "
                          f"(timing: {global_timing}, tz: {event_tz})")

            except Exception as e:
                print(f"Error processing birthday {bday}: {e}")


def process_email_jobs():
    """Process pending email verification/reminder jobs from Firestore."""
    if not db:
        return
    
    try:
        now = int(time.time() * 1000)  # milliseconds
        
        # Query pending email jobs that haven't expired
        email_jobs_ref = db.collection('email_jobs')
        jobs = email_jobs_ref.where('status', '==', 'pending').where('expiresAt', '>', now).stream()
        
        job_count = 0
        for job_doc in jobs:
            job = job_doc.to_dict()
            job_id = job_doc.id
            channel = job.get('channel', 'email')
            
            try:
                # Push to appropriate queue based on channel
                payload = json.dumps(job)
                
                if channel == 'email':
                    r.lpush('email_verification_queue', payload)
                elif channel == 'telegram':
                    r.lpush('telegram_verification_queue', payload)
                elif channel == 'discord':
                    r.lpush('discord_verification_queue', payload)
                
                # Mark job as queued
                job_doc.reference.update({'status': 'queued'})
                job_count += 1
                
            except Exception as e:
                print(f"Error processing email job {job_id}: {e}")
                job_doc.reference.update({'status': 'failed'})
        
        if job_count > 0:
            print(f"  ✓ Queued {job_count} email job(s)")
            
    except Exception as e:
        print(f"Error in process_email_jobs: {e}")


if __name__ == "__main__":
    print(f"Scheduler started (interval: {CHECK_INTERVAL}s)")
    while True:
        try:
            check_birthdays()
            process_email_jobs()
        except Exception as e:
            print(f"Scheduler loop error: {e}")
        time.sleep(CHECK_INTERVAL)
