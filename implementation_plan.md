# Implementation Plan: Smart Knowledge Base, Auto-Inventory, Passcode Security, Notifications

## Background & Problem

Currently, the RAG knowledge base ([rag_service.py](file:///c:/Users/vicky/takeover-hackathon/backend/app/services/rag_service.py)) operates on a **"full file upload/replace"** model. Every time a price changes or stock count updates, the entire markdown file must be re-uploaded. Additionally:

- There is **no stock tracking** — inventory numbers in the catalog are static text, never updated when quotations are generated.
- There is **no granular editing** — users must download, edit externally, and re-upload the entire file.
- There is **no security layer** on who can edit knowledge base documents.
- There is **no audit trail or notification** when knowledge data changes.

---

## Proposed Changes

### 1. Auto-Updating Inventory Counts (Stock In/Out Tracking)

> **Goal:** When a quotation is generated (stock goes out) or when stock is manually received (stock comes in), the inventory counts in the knowledge base should update automatically.

#### Multi-Tenant Isolation & Customization (Crucial)
To guarantee that different companies' inventories are strictly isolated and never mixed:
- **Database-Level Isolation:** We utilize the project's existing multi-tenancy architecture. Because the database session uses **PostgreSQL Schema Separation Mode** (or separate SQLite files for local development), the new `inventory` and `knowledge_edit_logs` tables will be created *dynamically inside each company's isolated schema*. Company A's queries will run strictly under `session_company_a`, making it physically impossible to mix or access Company B's inventory.
- **Dynamic Catalog/Inventory Schema:** Since different companies sell different products, the `inventory` table will map dynamically to the catalog uploaded by each tenant. We will use a flexible schema where `product_name` and `sku` serve as the main identifiers, and optional attributes can be stored in a JSON `metadata` column for company-specific fields (like size, color, weight, serial numbers).

#### How It Works

**A. New `Inventory` Database Table**

Instead of relying on parsing markdown text for stock numbers (which is fragile — see [inventory.py L25-48](file:///c:/Users/vicky/takeover-hackathon/backend/app/tools/inventory.py#L25-L48)), we introduce a proper `inventory` table:

```
inventory
├── id (PK)
├── product_name (string, indexed)
├── sku (string, unique, indexed)
├── current_stock (integer)
├── last_updated (datetime)
├── updated_by (string)  ← tracks who/what changed it
└── metadata (JSON)      ← allows company-specific attributes (sizes, categories, custom specs)
```

**B. Auto-Deduction on Quote Generation**

In [engine.py L266-295](file:///c:/Users/vicky/takeover-hackathon/backend/app/workflows/engine.py#L266-L295), after a quote is successfully generated, automatically deduct the quoted quantity from the `inventory` table:

```
inventory.current_stock -= quoted_quantity
```

**C. Stock Receive Endpoint (Incoming Stock)**

A new API endpoint `POST /inventory/receive` allows warehouse staff to log incoming stock:

```json
{ "sku": "WD-A-01", "quantity_received": 500, "note": "Shipment from supplier" }
```

This increments `current_stock` and creates a notification.

**D. Inventory Tool Reads from DB**

The existing `InventoryTool.check_stock()` method ([inventory.py](file:///c:/Users/vicky/takeover-hackathon/backend/app/tools/inventory.py)) will be updated to **query the `inventory` table first**, falling back to RAG text parsing only if no DB record exists. This makes stock counts reliable and real-time.

**E. Seed Inventory from Catalog on Onboarding**

During onboarding ([seed_service.py](file:///c:/Users/vicky/takeover-hackathon/backend/app/services/seed_service.py)), populate the `inventory` table from the uploaded catalog data so users start with correct stock counts.

---

### 2. Context-Based Editing (AI-Assisted Inline Edits)

> **Goal:** Instead of replacing the whole file, users describe what they want to change in natural language, the system proposes a diff, and they accept/reject it.

#### How It Works — "Knowledge Editor" Page

**A. New Frontend Page: `/dashboard/knowledge/edit/:category/:filename`**

When a user clicks "Edit" on a knowledge document, they land on a dedicated editor page with:

| Left Panel | Right Panel |
|---|---|
| Current document content (read-only, syntax-highlighted markdown) | Edit instruction input + proposed diff preview |

**B. The Edit Flow**

1. User enters natural language edit instructions ("Change Widget A price from $10 to $12").
2. Backend LLM parses current content and instruction to propose new content.
3. System generates structured side-by-side diff using python's `difflib`.
4. User reviews diff, inputs passcode, and accepts.
5. System overwrites file, re-indexes RAG, logs the edit, and issues a dashboard notification.

**C. Backend Endpoints**

- `POST /knowledge/propose-edit`: Takes `{category, filename, instruction}`, returns proposed changes and diffs.
- `POST /knowledge/apply-edit`: Takes `{category, filename, proposed_content, passcode}`, verifies auth, applies, logs, and triggers notification.

---

### 3. Security Model — Who Can Edit?

> **Goal:** Prevent unauthorized employees from modifying knowledge base data.

#### Approach: Passcode-Gated Editing with Role Levels

We leverage the workspace's existing `passcode_hash` auth setup:

**A. New `KnowledgeEditLog` Table (Audit Trail)**

Tracks `filename`, `category`, `editor_identity`, `instruction`, `diff_summary`, `status`, and `applied_at`.

**B. Security Gate on Apply**

The `/knowledge/apply-edit` endpoint enforces passcode validation. A SHA-256 hash of the passcode must match the stored workspace passcode hash to proceed.

---

### 4. Dashboard Notifications for Knowledge Changes

> **Goal:** When any knowledge document is edited, a notification must appear on the main dashboard so no one misses it.

#### How It Works

**A. Notification Creation on Edit**

Successful edits automatically dispatch a system notification record:
`Notification(type="KNOWLEDGE_UPDATED", message="📝 Knowledge base updated...")`

**B. Dashboard Notification Badge**

Pulsing notification indicator badges in the frontend will automatically pick up any unread notification of this type.

---

## Verification Plan

### Automated Tests
- Test `POST /knowledge/propose-edit` returns valid diff output
- Test `POST /knowledge/apply-edit` rejects without correct passcode (401)
- Test `POST /knowledge/apply-edit` creates a Notification record
- Test inventory auto-deduction after `generate_quote_tool` execution

### Manual Verification
- Walk through the edit flow: describe a change → see the diff → enter passcode → apply
- Verify notification appears on the dashboard with change details
- Verify RAG re-indexes after an edit (query the changed data)
