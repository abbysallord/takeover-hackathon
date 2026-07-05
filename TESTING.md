# AI Sales Operations Manager - Testing & Demo Guide

This guide details the steps to set up, launch, onboard, and comprehensively test the autonomous AI Sales Operations Manager workspace.

---

## 🚀 Setup & Installation

### 1. Backend Setup
Navigate to the `backend/` directory:
```bash
cd backend
```
Activate the virtual environment and install dependencies:
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Frontend Setup
Navigate to the `frontend/` directory:
```bash
cd frontend
npm install
```

---

## 🏃 Running the Application

### 1. Start the FastAPI Backend
Start the backend server on port `8001` with auto-reload:
```bash
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```
You can verify the backend is running by opening the Swagger API Docs at [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs).

### 2. Start the Vite React Frontend
Start the local dev server on port `5173`:
```bash
cd frontend
npm run dev
```
Open [http://127.0.0.1:5173](http://127.0.0.1:5173) in your browser to view the application.

---

## 💼 Workspace Onboarding Flow

When you first navigate to the dashboard ([http://127.0.0.1:5173/dashboard](http://127.0.0.1:5173/dashboard)), the system intercepts the route, detects that no active workspace exists in SQLite, and redirects you to the setup wizard:

1.  **Welcome Panel**: Enter your Company Name, Business Sales Email, and Industry sector.
2.  **Gmail Connection**: Connect a sandbox business inbox.
3.  **Product Catalogue**: Write your product catalogue in Markdown. You can click **"Load Acme Electronic Template"** to pre-fill it.
4.  **Pricing & Policies**: Write pricing guidelines and discount brackets. You can click **"Load Acme Pricing Template"** to pre-fill it.
5.  **Finish Setup**: Click **"Launch Workspace"**. This saves the data, writes the markdown catalogues to the backend RAG knowledge directories (`knowledge/products/` & `knowledge/pricing/`), and automatically re-indexes the RAG system!

---

## 📧 Gmail Sync & Integration Guide

The current build operates in a local sandbox mode for demonstration. To connect a live production business Gmail account:

1.  **GCP Console Setup**:
    *   Create a Google Cloud Project on the [Google Cloud Console](https://console.cloud.google.com/).
    *   Enable the **Gmail API** inside the API Library.
    *   Configure the OAuth Consent Screen, adding your testing business email as a Test User.
2.  **Generate OAuth Credentials**:
    *   Go to Credentials -> Create Credentials -> **OAuth Client ID**.
    *   Set Application Type to *Web Application* or *Desktop Application*.
    *   Add redirect URIs (e.g. `http://127.0.0.1:8001/gmail/callback` or matching frontend origins).
    *   Download the `client_secrets.json` file.
3.  **Backend Integration**:
    *   Place `client_secrets.json` in the `backend/` directory.
    *   Uncomment the OAuth authentication flow inside the backend gmail service to authorize the scopes `https://www.googleapis.com/auth/gmail.modify` and `https://www.googleapis.com/auth/gmail.send`.

---

## 🧪 Comprehensive Walkthrough Scripts

There are two primary demo scripts available directly from the main dashboard:

### Walkthrough A: Interactive Simulation (Manual Approval Gate)
1.  On the dashboard, click **"Simulate New Email"** in the top-right corner.
2.  This generates a new inbound email from Tony Stark requesting 120 units of `Widget B`.
3.  The agent automatically boots up, performs RAG retrieval, runs inventory check (confirming stock), applies the standard volume discount (10% discount bringing unit price from $45 to $40.50), generates quote `QT-2026-...` for `$4,860.00`, and pauses at the manager approval step.
4.  **Live Observability**: Go to the **Active Workflow Pipeline** table. Click on **any process row** to expand it. You will see:
    *   The specific **Tool Activated** (e.g., `rag_tool`, `inventory_tool`, `pricing_tool`).
    *   The precise **Execution Time** duration.
    *   The **AI Confidence Rating** for that step.
    *   The detailed **Agent Reasoning & Thought Process** explanation.
5.  **Approval Execution**: Go to the **Approval Center** in the sidebar. Click **Approve** on the pending quotation, and confirm.
6.  Navigate back to the Dashboard. The pipeline table will show the remaining steps (`Sending Response Email`, `Creating CRM qualified Lead`, `Scheduling Follow-up`) executing and successfully transitioning to **Completed**!

### Walkthrough B: End-to-End Demo Mode (1-Click Run)
1.  Click **"Run Demo Mode"** in the dashboard header.
2.  This triggers a single synchronous API sequence that executes the entire workflow, calculates pricing, auto-approves the quotation, dispatches the email reply, registers the CRM lead, schedules a follow-up, and returns the final completed pipeline status in a single pass.
3.  Dashboard statistics (emails received, time saved, revenue pipeline) will update automatically.

---

## 📡 API Reference Map

### 1. Workspace
*   `GET /workspace`: Check if the workspace setup has been initialized.
*   `POST /workspace/setup`: Save onboarding profiles and write documents to the RAG repository.

### 2. Dashboard & Analytics
*   `GET /dashboard`: Aggregates SQLite database metrics, unread notifications, recent workflows, and approvals.
*   `GET /analytics`: Automation rates, top products by volume, and daily processing queues.

### 3. Workflows
*   `GET /workflows`: Get active workflow history pipelines.
*   `GET /workflows/{id}`: Detailed stages and outputs for a specific workflow.
*   `POST /workflows/simulate`: Simulate receiving a new customer email.
*   `POST /workflows/demo-run`: Run a fully automated 1-click demo execution.
*   `GET /workflows/{id}/trace`: Fetch structured, machine-readable timeline trace.
*   `GET /workflows/{id}/reasoning`: Fetch step reasoning thoughts and confidence scores.

### 4. Approvals
*   `GET /approvals`: List all approval records.
*   `POST /approvals/{id}`: Approve or reject a paused quotation gate.

---

## ⚠️ Known Limitations
*   **Sandbox Sync**: Email, CRM, and Calendaring functions utilize simulated sandbox output logging. Real-world API providers (Salesforce, Google Calendar) can be integrated by replacing the client wrappers in `backend/app/services/`.
*   **Local Embedding Weights**: Local encoding relies on standard CPU sentence-transformers. Ensure Python has write-access to the local cache directory (`~/.cache/`) to download model weights on first boot.
