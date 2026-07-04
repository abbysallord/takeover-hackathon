# API Specifications

This document outlines the draft REST APIs for the AI Sales Operations Manager. These endpoints will connect the frontend operator dashboard, human-in-the-loop approvals, and external service simulations.

---

## 🚦 Endpoint Summary

### 📥 1. Inbound Integrations & Simulations

#### `POST /api/v1/webhooks/inbound-email`
Simulates a new customer sales inquiry arriving via email.
*   **Request Body**:
    ```json
    {
      "sender": "client@example.com",
      "subject": "Inquiry: Bulk pricing for Widget-X",
      "body": "Hi, I'm looking to buy 500 units of Widget-X for our new facility. Could you provide a quote and delivery timeline? Thanks, Jane."
    }
    ```
*   **Response** (`202 Accepted`):
    ```json
    {
      "workflow_id": "wf_abc123xyz",
      "status": "initiated"
    }
    ```

---

### 🔄 2. Workflow Management

#### `GET /api/v1/workflows`
Returns a list of all active and completed workflows for the dashboard.
*   **Response** (`200 OK`):
    ```json
    {
      "workflows": [
        {
          "workflow_id": "wf_abc123xyz",
          "status": "pending_approval",
          "current_step": "manager_approval",
          "customer_email": "client@example.com",
          "created_at": "2026-07-04T21:00:00Z"
        }
      ]
    }
    ```

#### `GET /api/v1/workflows/{id}`
Retrieves detailed status, variables, and step history of a specific workflow run.
*   **Response** (`200 OK`):
    ```json
    {
      "workflow_id": "wf_abc123xyz",
      "status": "pending_approval",
      "extracted_data": {
        "customer_name": "Jane",
        "company": "Example Corp",
        "product": "Widget-X",
        "quantity": 500
      },
      "quotation": {
        "quote_number": "QT-2026-001",
        "total_amount": 4500.00,
        "tax": 450.00,
        "grand_total": 4950.00
      },
      "steps": [
        { "name": "email_received", "status": "completed", "timestamp": "2026-07-04T21:00:00Z" },
        { "name": "data_extraction", "status": "completed", "timestamp": "2026-07-04T21:00:02Z" },
        { "name": "rag_pricing", "status": "completed", "timestamp": "2026-07-04T21:00:03Z" },
        { "name": "inventory_check", "status": "completed", "timestamp": "2026-07-04T21:00:04Z" },
        { "name": "quotation_generation", "status": "completed", "timestamp": "2026-07-04T21:00:05Z" },
        { "name": "manager_approval", "status": "pending", "timestamp": "2026-07-04T21:00:06Z" }
      ]
    }
    ```

---

### ✍️ 3. Approvals

#### `POST /api/v1/workflows/{id}/approve`
Approves the drafted quotation and triggers email dispatch + CRM sync.
*   **Request Body**:
    ```json
    {
      "notes": "Approved. Offer a 5% discount on shipping if requested."
    }
    ```
*   **Response** (`200 OK`):
    ```json
    {
      "workflow_id": "wf_abc123xyz",
      "status": "approved",
      "next_step": "send_email"
    }
    ```

#### `POST /api/v1/workflows/{id}/reject`
Rejects the draft, providing correction instructions to feed back to the AI.
*   **Request Body**:
    ```json
    {
      "reason": "Change Widget-X unit price to $9.00 instead of $10.00."
    }
    ```
*   **Response** (`200 OK`):
    ```json
    {
      "workflow_id": "wf_abc123xyz",
      "status": "regenerating",
      "next_step": "quotation_regeneration"
    }
    ```
