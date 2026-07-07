# Takeover Application Architecture & Features

This document provides a comprehensive overview of the **Takeover** application in its current state. It details the core features, the multi-tenant architecture, and the integrations before you begin making extensive modifications.

---

## 1. Core Purpose & Features
The application is an AI-driven, multi-tenant workspace platform designed to automate business operations like lead extraction, quoting, and email management. 

### Key Capabilities:
- **Workspace Onboarding**: Users can set up a workspace by providing their company name, industry, and uploading their product catalogs and pricing sheets.
- **RAG Knowledge Base**: Uploaded catalogs and pricing data are saved to a dynamic Retrieval-Augmented Generation (RAG) system (`app/services/rag_service.py`), allowing the AI to understand the company's offerings and pricing.
- **Gmail Integration**: Users can connect their Gmail account via Google OAuth. The system uses this to sync emails and automatically trigger workflows.
- **AI Workflows & Automation**: The backend processes incoming emails, identifies potential customers, generates quotations based on the RAG knowledge base, and routes them through an approval system.
- **Dashboard Analytics**: Tracks metrics like emails received, active workflows, pending approvals, generated quotes, and AI confidence.

---

## 2. Multi-Tenant Architecture
One of the most complex and powerful parts of this application is its **dynamic session-based multi-tenancy**. Instead of using traditional user accounts and passwords, isolation is managed via "Sessions".

### How it works:
1. **Frontend Session Generation**: 
   - When a user visits the site, `main.tsx` generates a random session ID (e.g., `session_123abc`).
   - This ID is saved to `localStorage` (`flow_session_id`) and automatically injected into the headers (`X-Session-ID`) of *every* API request.
2. **Backend Interception**:
   - The backend `tenant_session_middleware` intercepts every request, extracts the `X-Session-ID`, and stores it in a thread-safe `ContextVar`.
3. **Database Isolation**:
   - The database dependency (`get_db`) dynamically routes queries to isolated environments based on the session ID.
   - **PostgreSQL**: It creates and utilizes separate **schemas** for every user (e.g., `session_123abc`). It achieves this using SQLAlchemy's `schema_translate_map` and the `search_path`.
   - **SQLite**: (Used for local dev) It creates entirely separate `.db` files for every session.
4. **Knowledge Base Isolation**:
   - The RAG system stores uploaded text files inside dynamically generated folders for each tenant (`/tmp/knowledge/session_123abc/`).

---

## 3. Google OAuth Flow
The Gmail connection uses a customized OAuth 2.0 flow designed to survive cross-domain redirects while maintaining tenant isolation.

1. **Initiation**: The frontend calls `/workspace/auth-url`. The backend embeds the user's `session_id` inside the OAuth `state` parameter to ensure the session identity isn't lost during the redirect to Google.
2. **Google Consent**: The user authorizes the app to read and send emails.
3. **Callback**: Google redirects the user back to `/workspace/oauth-callback?state=session_123abc`.
4. **Re-establishing Context**: The middleware extracts the `session_id` from the `state` parameter. The backend successfully routes the database connection to the correct tenant schema and saves the Google Access/Refresh tokens securely.
5. **Redirection**: The user is redirected back to the frontend (`/onboarding?gmail_connected=true`), and the app seamlessly resumes.

---

## 4. Backend Structure
The backend is built with **FastAPI** and **SQLAlchemy 2.0**.
- **`/app/main.py`**: Entry point. Contains the multi-tenancy middleware, CORS configuration, background polling tasks, and database migrations.
- **`/app/api/`**: Contains the API routers (`workspace.py`, `emails.py`, `workflows.py`, `dashboard.py`, etc.).
- **`/app/models/`**: 
  - `models.py`: Defines the SQLAlchemy tables (`Workspace`, `Email`, `Workflow`, `Customer`, `Lead`, `Quotation`, etc.).
  - `database.py`: Contains the `get_db` generator and the dynamic schema routing logic.
- **`/app/services/`**: Contains the business logic for Gmail polling, AI automation, and RAG document retrieval.

---

## 5. Frontend Structure
The frontend is a **React + Vite** application.
- **`/src/main.tsx`**: Bootstraps the app and patches the global `fetch` function to inject the `X-Session-ID` header.
- **`/src/pages/`**: 
  - `OnboardingPage.tsx`: Handles company setup and Gmail connection.
  - `DashboardPage.tsx`: Displays analytics and active workflows.
  - `SettingsPage.tsx`: Allows users to manage their catalog, disconnect Gmail, or copy their Session Key to move to another browser.
- **`/src/services/mockApi.ts`**: Handles all communication with the FastAPI backend.

---

> [!NOTE]
> **Before and After Tracking**
> Keep this document handy as you make changes. Because the database schemas are generated dynamically, if you add new columns or tables in `models.py`, ensure that `main.py`'s `lifespan` migration script is properly updated to apply those changes to existing schemas, otherwise you will encounter `UndefinedTable` or `UndefinedColumn` errors.
