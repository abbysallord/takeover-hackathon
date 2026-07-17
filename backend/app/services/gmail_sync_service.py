import base64
from datetime import datetime, timedelta
import httpx
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.core.config import settings
from app.models.models import Workspace, Email
from app.services.workflow_service import WorkflowService


async def exchange_auth_code(
    code: str, client_id: str, client_secret: str, redirect_uri: str
) -> Dict[str, Any]:
    """Exchanges Google authorization code for Access and Refresh tokens."""
    url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }
    async with httpx.AsyncClient() as client:
        res = await client.post(url, data=data)
        if res.status_code != 200:
            raise Exception(f"Failed to exchange auth token: {res.text}")
        return res.json()


async def refresh_access_token(
    client_id: str, client_secret: str, refresh_token: str
) -> Dict[str, Any]:
    """Uses a refresh token to generate a new Google access token."""
    url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    async with httpx.AsyncClient() as client:
        res = await client.post(url, data=data)
        if res.status_code != 200:
            raise Exception(f"Failed to refresh access token: {res.text}")
        return res.json()


async def poll_gmail_inbox(db: Session) -> None:
    """Polls Gmail for unread emails, starts AI workflows, and marks them read."""
    workspace = db.query(Workspace).first()
    if not workspace or not workspace.gmail_connected or not workspace.google_refresh_token:
        return

    client_id = (
        workspace.google_client_id
        or settings.GOOGLE_CLIENT_ID
    )
    client_secret = (
        workspace.google_client_secret or settings.GOOGLE_CLIENT_SECRET
    )

    # Refresh access token if expired or close to expiry
    if (
        not workspace.google_access_token
        or not workspace.google_token_expires_at
        or datetime.now() >= workspace.google_token_expires_at - timedelta(minutes=5)
    ):
        try:
            token_data = await refresh_access_token(
                client_id, client_secret, workspace.google_refresh_token
            )
            workspace.google_access_token = token_data["access_token"]
            workspace.google_token_expires_at = datetime.now() + timedelta(
                seconds=token_data["expires_in"]
            )
            db.commit()
            print("🔄 Successfully refreshed Gmail API access token.")
        except Exception as e:
            print(f"⚠️ Failed to auto-refresh Google OAuth token: {e}")
            return

    access_token = workspace.google_access_token
    headers = {"Authorization": f"Bearer {access_token}"}

    yesterday_date = (datetime.now() - timedelta(days=1)).strftime("%Y/%m/%d")
    search_q = f"is:unread after:{yesterday_date}"

    async with httpx.AsyncClient() as client:
        # Get list of unread messages
        res = await client.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages",
            headers=headers,
            params={"q": search_q},
        )
        if res.status_code != 200:
            print(f"⚠️ Gmail API error fetching unread messages: {res.text}")
            return

        data = res.json()
        messages = data.get("messages", [])
        if not messages:
            return

        print(f"📬 Found {len(messages)} new unread email(s) in Gmail inbox.")
        for msg_meta in messages:
            msg_id = msg_meta["id"]

            # Avoid double-processing the same message ID
            existing_email = db.query(Email).filter(Email.message_id == msg_id).first()
            if existing_email:
                # Mark as read on Google since it has been stored
                await client.post(
                    f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}/modify",
                    headers=headers,
                    json={"removeLabelIds": ["UNREAD"]},
                )
                continue

            # Fetch the email details
            msg_res = await client.get(
                f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}",
                headers=headers,
            )
            if msg_res.status_code != 200:
                print(f"⚠️ Gmail API failed fetching message {msg_id}: {msg_res.text}")
                continue

            msg = msg_res.json()
            headers_list = msg.get("payload", {}).get("headers", [])

            sender = "unknown@sender.com"
            recipient = workspace.business_email
            subject = "No Subject"

            for h in headers_list:
                name = h["name"].lower()
                if name == "from":
                    sender = h["value"]
                elif name == "to":
                    recipient = h["value"]
                elif name == "subject":
                    subject = h["value"]

            # Extract body
            body = msg.get("snippet", "")
            payload = msg.get("payload", {})
            
            def decode_body_part(data_payload):
                body_data = data_payload.get("body", {}).get("data", "")
                if body_data:
                    try:
                        return base64.urlsafe_b64decode(body_data).decode("utf-8")
                    except Exception:
                        pass
                return ""

            def extract_body_from_parts(parts_list) -> str:
                # First pass: look for text/plain
                for part in parts_list:
                    mime_type = part.get("mimeType", "")
                    body_data = part.get("body", {}).get("data", "")
                    if mime_type == "text/plain" and body_data:
                        try:
                            return base64.urlsafe_b64decode(body_data).decode("utf-8")
                        except Exception:
                            pass
                    if "parts" in part:
                        nested = extract_body_from_parts(part["parts"])
                        if nested:
                            return nested
                
                # Second pass: look for text/html
                for part in parts_list:
                    mime_type = part.get("mimeType", "")
                    body_data = part.get("body", {}).get("data", "")
                    if mime_type == "text/html" and body_data:
                        try:
                            return base64.urlsafe_b64decode(body_data).decode("utf-8")
                        except Exception:
                            pass
                return ""

            decoded_body = ""
            payload_mime = payload.get("mimeType", "")
            if payload_mime.startswith("text/") and payload.get("body", {}).get("data", ""):
                decoded_body = decode_body_part(payload)
            elif "parts" in payload:
                decoded_body = extract_body_from_parts(payload["parts"])

            final_body = decoded_body or body

            try:
                # Trigger Autonomous AI state machine for new email
                service = WorkflowService()
                workflow = service.process_new_email(
                    db=db,
                    sender=sender,
                    recipient=recipient,
                    subject=subject,
                    body=final_body,
                    message_id=msg_id,
                )

                # Mark the email read in Google Inbox
                await client.post(
                    f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}/modify",
                    headers=headers,
                    json={"removeLabelIds": ["UNREAD"]},
                )
                print(f"🤖 Auto-triggered AI workflow #{workflow.id} for email: {subject}")

            except Exception as e:
                print(f"⚠️ Failed processing email workflow: {e}")


async def send_gmail_email(
    db: Session,
    workspace: Workspace,
    to_email: str,
    subject: str,
    body: str,
) -> Dict[str, Any]:
    """Sends a real email using the workspace's authorized Gmail OAuth credentials."""
    import base64
    from email.mime.text import MIMEText
    
    # 1. Refresh access token first if needed
    client_id = workspace.google_client_id or settings.GOOGLE_CLIENT_ID
    client_secret = workspace.google_client_secret or settings.GOOGLE_CLIENT_SECRET
    
    if (
        not workspace.google_access_token
        or not workspace.google_token_expires_at
        or datetime.now() >= workspace.google_token_expires_at - timedelta(minutes=5)
    ):
        try:
            token_data = await refresh_access_token(
                client_id, client_secret, workspace.google_refresh_token
            )
            workspace.google_access_token = token_data["access_token"]
            workspace.google_token_expires_at = datetime.now() + timedelta(
                seconds=token_data["expires_in"]
            )
            db.commit()
        except Exception as e:
            print(f"⚠️ Failed to refresh token before sending: {e}")
            raise e

    # 2. Build MIME email
    message = MIMEText(body)
    message["to"] = to_email
    message["subject"] = subject
    
    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
    
    url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
    headers = {
        "Authorization": f"Bearer {workspace.google_access_token}",
        "Content-Type": "application/json",
    }
    
    async with httpx.AsyncClient() as client:
        res = await client.post(url, headers=headers, json={"raw": raw_message})
        if res.status_code != 200:
            raise Exception(f"Gmail send API failed: {res.text}")
        return res.json()


def send_gmail_email_sync(
    db: Session,
    workspace: Workspace,
    to_email: str,
    subject: str,
    body: str,
) -> Dict[str, Any]:
    """Sends a real email synchronously using standard HTTP client."""
    import base64
    from email.mime.text import MIMEText
    
    client_id = workspace.google_client_id or settings.GOOGLE_CLIENT_ID
    client_secret = workspace.google_client_secret or settings.GOOGLE_CLIENT_SECRET
    
    # 1. Refresh token synchronously if needed
    if (
        not workspace.google_access_token
        or not workspace.google_token_expires_at
        or datetime.now() >= workspace.google_token_expires_at - timedelta(minutes=5)
    ):
        url = "https://oauth2.googleapis.com/token"
        data = {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": workspace.google_refresh_token,
            "grant_type": "refresh_token",
        }
        with httpx.Client() as client:
            res = client.post(url, data=data)
            if res.status_code != 200:
                raise Exception(f"Failed to refresh access token: {res.text}")
            token_data = res.json()
            workspace.google_access_token = token_data["access_token"]
            workspace.google_token_expires_at = datetime.now() + timedelta(
                seconds=token_data["expires_in"]
            )
            db.commit()

    # 2. Build MIME email
    message = MIMEText(body)
    message["to"] = to_email
    message["subject"] = subject
    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
    
    url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
    headers = {
        "Authorization": f"Bearer {workspace.google_access_token}",
        "Content-Type": "application/json",
    }
    
    with httpx.Client() as client:
        res = client.post(url, headers=headers, json={"raw": raw_message})
        if res.status_code != 200:
            raise Exception(f"Gmail send API failed: {res.text}")
        return res.json()
