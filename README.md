# AI Sales Operations Manager (TakeOver'26 Hackathon)

An autonomous digital employee built for **TakeOver'26 Hackathon (Theme 2: Autonomous Workflow Agents)**.

---

## 📌 Problem Statement
> *"Businesses lack intelligent systems that can automatically execute multi-step workflows involving multiple departments and approvals."*

Traditional solutions rely on simple chatbots or basic ChatGPT wrappers that fail to interface with existing business tools, process multi-stage logics, or safely request human approvals. This product bridges that gap by behaving as a digital employee that handles sales operations workflows end-to-end.

---

## 🚀 Solution Overview
The **AI Sales Operations Manager** is an autonomous agent designed to process sales enquiries and orchestrate complex business workflows across various systems. Rather than being just a chatbot, it manages execution, coordinates approvals, and synchronizes tools automatically.

### Target Workflow Example
1. **Inbound Contact**: Customer sends an email.
2. **Intent Analysis**: AI understands the intent of the email.
3. **Data Extraction**: Extracts customer, company, and product details.
4. **Knowledge Retrieval**: Retrieves pricing, discount terms, and company policies via Retrieval-Augmented Generation (RAG).
5. **Inventory Check**: Queries the inventory system (mocked or integrated).
6. **Quotation Generation**: Automatically drafts a professional sales quotation.
7. **Human-in-the-Loop Approval**: Requests manager approval for the generated quotation.
8. **Outbound Dispatch**: Sends the approved quotation and reply back to the customer.
9. **CRM Sync**: Creates or updates a lead in the CRM system.
10. **Task Scheduling**: Schedules follow-up calendar invites.
11. **Analytics & Monitoring**: Updates the live operator dashboard.

---

## 👥 Team & Roles
*   **Dhanush** - Backend + AI Orchestration
*   **Anand** - Frontend + UI/UX Design

---

## 🛠️ Tech Stack (Placeholder)
*(To be updated as development proceeds)*
*   **Backend & Orchestration**: Python / Fast API / LangChain / LangGraph (TBD)
*   **Frontend & Dashboard**: React / Next.js / Tailwind CSS (TBD)
*   **Database & RAG**: PostgreSQL / Vector DB / pgvector (TBD)
*   **Third-Party APIs**: Gmail API, mock inventory API, CRM mock/API

---

## 📂 Repository Structure
```text
takeover-hackathon/
├── backend/          # Python backend, AI agents, RAG, and APIs
├── frontend/         # Frontend dashboard and operator control panel
├── docs/             # Technical specifications, architecture, and workflow documentation
│   ├── api.md
│   ├── architecture.md
│   └── workflow.md
├── assets/           # UI mockups, diagrams, and static assets
├── .editorconfig     # Code formatting configuration
├── .gitignore        # Monorepo-specific git ignores
├── LICENSE           # MIT License
└── README.md         # Main project documentation
```

---

## ⚙️ Getting Started (Placeholder)
*(Instructions on setting up and running the frontend and backend locally will be populated here.)*

### Prerequisites
*   Node.js (v18+)
*   Python (v3.10+)

### Setup Instructions
1.  Clone the repository:
    ```bash
    git clone https://github.com/abbysallord/takeover-hackathon.git
    cd takeover-hackathon
    ```
2.  Follow the setup guidelines in `/backend` and `/frontend` directories.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
