# AI Sales Operations Manager - Backend

This folder contains the backend services, database operations, external integrations, and AI workflow orchestration engines.

---

## 🛠️ Planned Tech Stack
*   **API Framework**: FastAPI (high-performance, automatic documentation)
*   **Orchestration Engine**: LangChain / LangGraph (for stateful multi-step agent execution)
*   **Database & Vector Search**: PostgreSQL with `pgvector` or a lightweight vector store
*   **Environment Management**: `venv` / `poetry` / `uv`
*   **LLM Client**: Google GenAI SDK (Gemini 2.5/1.5 Flash/Pro) / OpenAI Client

---

## 📂 Proposed Directory Structure
*(To be populated during backend development)*
```text
backend/
├── app/
│   ├── api/             # FastAPI routes (webhooks, dashboard APIs, approvals)
│   ├── core/            # Configuration, logging, security
│   ├── database/        # DB session, models, schema migrations
│   ├── workflows/       # Stateful orchestration logic & agents
│   │   ├── steps/       # Individual workflow task handlers
│   │   └── state.py     # State structures & graphs
│   ├── services/        # Integrations (Email, Mock CRM, Mock Inventory)
│   └── main.py          # Application entrypoint
├── tests/               # Unit and integration tests
├── scripts/             # Seed scripts, data loaders
├── requirements.txt     # Python dependencies
└── README.md            # This file
```

---

## ⚙️ Setup Instructions (Draft)
Once the backend framework is ready to be initialized:
1.  Create a virtual environment:
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Configure environment variables in a `.env` file based on `.env.example`.
4.  Run the server:
    ```bash
    uvicorn app.main:app --reload
    ```
