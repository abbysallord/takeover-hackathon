# AI Sales Operations Manager - Frontend

This folder contains the operator dashboard, approval screen, and workflow tracking visualizer.

---

## 🎨 Design & UI/UX Vision
The goal is to design a high-fidelity, premium interface to wow judges at first glance.
*   **Aesthetic**: Curated dark mode, modern typography (e.g., *Inter* or *Outfit*), clean card interfaces, smooth CSS transitions, and micro-interactions.
*   **Key Views**:
    *   **Workflow Pipeline**: A kanban or timeline view illustrating exactly where an inbound enquiry is in the pipeline (e.g., *Extraction -> Inventory -> Draft -> Approval -> Sent*).
    *   **Operator Control Panel**: A detailed review pane where managers can see the extracted query parameters, check the generated PDF quotation, and review/edit email responses before approval.
    *   **Analytics Dashboard**: Metric displays tracking processing times, automation rate, success rate, and value processed.

---

## 🛠️ Planned Tech Stack
*   **Framework**: Next.js / Vite + React / Vanilla JS (TBD)
*   **Styling**: Vanilla CSS (Tailwind if explicitly requested)
*   **Icons**: Lucide React / Heroicons

---

## 📂 Proposed Directory Structure
*(To be populated during frontend development)*
```text
frontend/
├── public/           # Static files
├── src/
│   ├── assets/       # Icons and UI images
│   ├── components/   # Reusable UI elements (Timeline, QuoteViewer, Header)
│   ├── hooks/        # Custom react hooks for fetching status
│   ├── styles/       # Design system tokens and global css overrides
│   ├── views/        # Dashboard, Approval, and Analytics pages
│   ├── App.jsx       # App logic and router
│   └── main.jsx      # React mount point
├── package.json      # Node dependencies
└── README.md         # This file
```

---

## ⚙️ Setup Instructions (Draft)
Once the frontend framework is initialized:
1.  Navigate to the directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run development server:
    ```bash
    npm run dev
    ```
