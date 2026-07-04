# Workflow State Machine Specification

This document details the multi-step execution cycle of the **AI Sales Operations Manager**. It serves as a blueprint for implementing the orchestration engine.

---

## 🎛️ State Machine Diagram

```
[Customer Email Received]
         │
         ▼
 1. Extract Details (LLM) ───► [Failed/Incomplete] ──► [Manual Fallback / Flagged]
         │ (Success)
         ▼
 2. RAG Pricing & Policies
         │
         ▼
 3. Check Inventory (Mock API) ──► [Out of Stock] ────► [Queue Backorder Notification]
         │ (In Stock)
         ▼
 4. Generate Quotation Draft
         │
         ▼
 5. Wait for Approval ◄──────────────────┐ (If Manager Rejects with edits)
         │                               │
         ├─► [Rejected] ─────────────────┘
         │ (Approved)
         ▼
 6. Dispatch Email & Quotation
         │
         ▼
 7. Sync CRM & Create Lead
         │
         ▼
 8. Schedule Follow-up (Calendar)
         │
         ▼
 9. Complete & Log Metrics
```

---

## 📋 Steps & Requirements

### Step 1: Extract Details
*   **Action**: LLM processes the email body to extract client name, company, products requested, and quantities.
*   **Error Handling**: If product name is unrecognized or critical details are missing, flag the workflow as `action_required` and show a prompt on the dashboard for the operator to resolve manually.

### Step 2: RAG Pricing
*   **Action**: Fetch standard pricing, discounts, and terms from local documents (PDFs, markdown rules) using Vector Search.
*   **Rule**: Calculate quantities and map them to bulk tier pricing.

### Step 3: Check Inventory
*   **Action**: Query the Mock Inventory Service.
*   **Branches**:
    *   *In Stock*: Update status to `in_stock` and proceed.
    *   *Out of Stock*: Calculate backorder time, flag as `backordered`, and draft a custom notification.

### Step 4: Generate Quotation Draft
*   **Action**: Construct a PDF or structured quotation containing unit prices, totals, tax, and discount terms.

### Step 5: Wait for Approval
*   **Action**: Pause the state machine. Write the state payload to the database. Set status to `pending_approval`.
*   **Dashboard Action**: Display the draft email and draft quotation to the manager.
*   **Inputs**:
    *   `APPROVE`: Resumes the state machine to Step 6.
    *   `REJECT`: Allows the manager to submit textual comments (e.g. "Add a 10% discount"). The agent reads these comments, regenerates the quotation, and loops back to Step 5.

### Step 6: Dispatch Email
*   **Action**: Send the final email and quotation attachment to the client.

### Step 7: Sync CRM
*   **Action**: Register the new client/lead details and quotation value into the mock CRM.

### Step 8: Schedule Follow-up
*   **Action**: Create a calendar item or reminder 3-5 days in the future to follow up on the quote.

### Step 9: Complete
*   **Action**: Record execution duration, token usage, and status in the analytics DB for the operator dashboard.
