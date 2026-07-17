# Implementation Plan: Centralized Knowledge Editor, Draft Persistence, Security & Notifications

## Background & Problem

Currently, the RAG knowledge base operates on a full file replace model. We want to implement a centralized editing suite where:
- Users can access the editor at a clean path: `/dashboard/knowledge/file/edit`.
- The left sidebar displays the file structure of all knowledge documents.
- Users can edit documents and save them as **persistent drafts** (uncommitted edits) to resume later.
- The sidebar shows which files have uncommitted drafts.
- Committing a draft requires workspace passcode authorization.
- Committing updates the active RAG index and triggers a notification.

---

## Proposed Changes

### 1. Database-Level Draft Persistence

We will create a `KnowledgeDraft` database table to persist edits across restarts and sessions.

**New `KnowledgeDraft` SQLAlchemy Model**
```python
class KnowledgeDraft(Base):
    __tablename__ = "knowledge_drafts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    filename: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(100))
    draft_content: Mapped[str] = mapped_column(Text)
    instruction: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
```

---

### 2. Backend API Modifications

We will implement new endpoints in `backend/app/api/knowledge.py`:

- **`GET /knowledge/drafts`**: Returns all active drafts. Used by the sidebar to show modified/uncommitted tags.
- **`POST /knowledge/propose-edit`**: Generates AI edits and automatically saves them into the `KnowledgeDraft` table as a draft.
- **`POST /knowledge/apply-edit`**: Passcode-gated. Writes the persisted draft content to the actual file, clears the `KnowledgeDraft` record, triggers RAG re-indexing, and generates notifications.
- **`POST /knowledge/discard-draft`**: Deletes a saved draft.

---

### 3. Frontend Workspace Editor

- **New Page `/dashboard/knowledge/file/edit`**:
  - **Left Sidebar**: Renders all categories and files. Files with active drafts in the database are flagged with a yellow `Uncommitted Draft` badge.
  - **Main Area**: 
    - Original document view.
    - AI assistant instructions.
    - Unified diff panel.
  - **Auto-Saving**: Any proposed change is committed to the database draft, allowing the user to switch files or close the browser and continue later.
  - **Commit Modal**: Secure passcode validation gate.

---

### 4. Navigation Changes

- We will add a prominent **"Open Workspace Editor"** action button at the top of the [KnowledgePage](file:///c:/Users/vicky/takeover-hackathon/frontend/src/pages/KnowledgePage.tsx).
- We will replace the Sparkles list icon with an **"Edit in Editor"** button/link that directly opens the central workspace editor focused on that specific file.

---

## Verification Plan

### Automated Tests
- Test database draft save (`POST /knowledge/propose-edit`) persists state
- Test file write and draft clean-up (`POST /knowledge/apply-edit`)
- Verify 401 code on invalid passcode verification

### Manual Verification
- Edit a document → check that the `Uncommitted Draft` badge appears in the sidebar.
- Reload page / navigate away → return and verify that the draft content is fully loaded and retained.
- Publish change → check that the file on disk is written and the badge is cleared.
ls
- Verify RAG re-indexes after an edit (query the changed data)
