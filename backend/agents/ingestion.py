import os
import requests
import time
import schedule
import threading
from workflow.state import EventState
from agents.state_agent import workflow_manager

SEEN_EVENT_IDS = set()
WARNED_CONNECTORS = set()
CONNECTOR_DISABLED = set()


def _ingest_source_event(event_id: str, source_type: str, text: str, metadata=None):
    if not text or len(text.strip()) < 20:
        return
    if event_id in SEEN_EVENT_IDS or event_id in workflow_manager.active_events:
        return
    SEEN_EVENT_IDS.add(event_id)
    state = EventState(
        id=event_id,
        source_type=source_type,
        raw_text=text,
        metadata=metadata or {}
    )
    workflow_manager.process_new_event(state)


def ingest_source_event(source_type: str, text: str, metadata=None, event_id: str | None = None):
    """Public helper for manual or connector-driven source intake."""
    resolved_event_id = event_id or f"{source_type}_{int(time.time() * 1000)}"
    _ingest_source_event(resolved_event_id, source_type, text, metadata)

def run_slack_poll():
    """Polls real Slack API using the SLACK_BOT_TOKEN for new channel activity."""
    if "slack" in CONNECTOR_DISABLED:
        return

    token = os.getenv("SLACK_BOT_TOKEN")
    
    if not token or token.startswith("${"):
        print("[Ingestion Agent] Slack token missing or unconfigured. Skipping real poll.")
        return
        
    try:
        # Example polling the general channels history
        # (For MVP we are catching the latest few messages)
        headers = {"Authorization": f"Bearer {token}"}
        res = requests.get("https://slack.com/api/conversations.list", headers=headers)
        if res.status_code == 200 and res.json().get("ok"):
            channels = res.json().get("channels", [])
            for c in channels[:1]: # Check first channel
                history_res = requests.get(
                    f"https://slack.com/api/conversations.history?channel={c['id']}&limit=5", 
                    headers=headers
                )
                if history_res.status_code == 200:
                    messages = history_res.json().get("messages", [])
                    for msg in messages:
                        if "text" in msg and len(msg["text"]) > 20:
                            ts = msg.get("ts")
                            event_id = f"slack_{c['id']}_{ts}"
                            _ingest_source_event(event_id, "slack", msg["text"], {"user": msg.get("user"), "channel": c.get("name")})
    except Exception as e:
        print(f"[Ingestion Agent] Slack poll error: {e}")
        CONNECTOR_DISABLED.add("slack")


def _get_google_access_token():
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    refresh_token = os.getenv("GOOGLE_REFRESH_TOKEN")
    if not all([client_id, client_secret, refresh_token]):
        return None
    try:
        res = requests.post("https://oauth2.googleapis.com/token", data={
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token"
        })
        return res.json().get("access_token")
    except Exception:
        return None


def run_gmail_poll():
    """Real Gmail polling via Google API."""
    if "gmail" in CONNECTOR_DISABLED:
        return
    access_token = _get_google_access_token()
    if not access_token:
        print("[Ingestion Agent] Google credentials missing or invalid. Skipping Gmail.")
        CONNECTOR_DISABLED.add("gmail")
        return
        
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        res = requests.get("https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=3", headers=headers)
        if res.status_code == 200:
            messages = res.json().get("messages", [])
            for msg in messages:
                msg_id = msg['id']
                msg_res = requests.get(f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}", headers=headers)
                if msg_res.status_code == 200:
                    snippet = msg_res.json().get("snippet", "")
                    if len(snippet) > 15:
                        _ingest_source_event(f"gmail_{msg_id}", "gmail", snippet, {"msg_id": msg_id})
    except Exception as e:
        print(f"[Ingestion Agent] Gmail poll error: {e}")


def run_gdrive_poll():
    """Real Google Drive polling via Google API."""
    if "gdrive" in CONNECTOR_DISABLED:
        return
    access_token = _get_google_access_token()
    if not access_token:
         return
         
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        res = requests.get("https://www.googleapis.com/drive/v3/files?q=mimeType='text/plain'&orderBy=modifiedTime desc&pageSize=3&fields=files(id,name)", headers=headers)
        if res.status_code == 200:
            files = res.json().get("files", [])
            for f in files:
                file_id = f['id']
                content_res = requests.get(f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media", headers=headers)
                if content_res.status_code == 200:
                    text_content = content_res.text
                    if len(text_content) > 15:
                         _ingest_source_event(f"gdrive_{file_id}", "gdrive", text_content, {"file_name": f.get('name')})
    except Exception as e:
        print(f"[Ingestion Agent] Drive poll error: {e}")


def run_demo_fallback_poll():
    """Fallback autonomous source when external connectors are not available."""
    event_id = f"fallback_{int(time.time())}"
    text = "Architecture council approved moving workflow audit logs to immutable storage. Action: notify platform team and create implementation task."
    _ingest_source_event(event_id, "fallback", text, {"mode": "fallback_demo"})

def run_background_ingestion():
    """Scheduled autonomous loop."""
    print("[Ingestion Agent] Background loop started.")
    schedule.every(30).seconds.do(run_slack_poll)
    schedule.every(60).seconds.do(run_gmail_poll)
    schedule.every(90).seconds.do(run_gdrive_poll)

    if os.getenv("INGESTION_FALLBACK_DEMO", "false").lower() == "true":
        schedule.every(90).seconds.do(run_demo_fallback_poll)

    while True:
        schedule.run_pending()
        time.sleep(1)

def start_ingestion_thread():
    thread = threading.Thread(target=run_background_ingestion, daemon=True)
    thread.start()
