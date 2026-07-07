-- ====================================================================
-- SUPABASE / POSTGRESQL SCHEMA FOR AI SALES OPERATIONS
-- ====================================================================

-- 1. ALTER TABLE COMMAND TO APPLY CURRENT CHANGES:
-- Run this in your Supabase SQL Editor to add the passcode support.
-- Make sure to run this on any existing tenant schemas (e.g. `ALTER TABLE session_xxx.workspaces ...`)
-- if you are modifying active databases.
--
-- ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS passcode_hash VARCHAR(255);


-- 2. FULL SCHEMA OF ALL 9 TABLES:
-- (For a new schema, run these within your schema search path)

-- Table 1: workspaces (Workspace metadata and configurations)
CREATE TABLE IF NOT EXISTS workspaces (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    business_email VARCHAR(255) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    gmail_connected BOOLEAN DEFAULT FALSE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    catalog_data TEXT,
    pricing_data TEXT,
    google_redirect_uri VARCHAR(255) DEFAULT 'http://localhost:8001/workspace/oauth-callback',
    google_client_id VARCHAR(255),
    google_client_secret VARCHAR(255),
    google_access_token VARCHAR(500),
    google_refresh_token VARCHAR(500),
    google_token_expires_at TIMESTAMP,
    passcode_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table 2: customers (CRM Contacts Directory)
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    company VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table 3: leads (CRM Sales Funnel)
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'NEW', -- NEW, CONTACTED, QUOTATION_SENT, WON, LOST
    value NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table 4: emails (Inbound enquiries and outbound replies log)
CREATE TABLE IF NOT EXISTS emails (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255),
    sender VARCHAR(255) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    direction VARCHAR(50) DEFAULT 'INBOUND', -- INBOUND, OUTBOUND
    received_at TIMESTAMP DEFAULT NOW()
);

-- Table 5: workflows (Autonomous AI Agent Workflows)
CREATE TABLE IF NOT EXISTS workflows (
    id SERIAL PRIMARY KEY,
    email_id INTEGER REFERENCES emails(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'RUNNING', -- RUNNING, PENDING_APPROVAL, COMPLETED, FAILED
    current_stage VARCHAR(100) DEFAULT 'EMAIL_RECEIVED',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table 6: workflow_steps (Step-by-step trace and LLM reasoning logs)
CREATE TABLE IF NOT EXISTS workflow_steps (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
    stage VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL, -- PENDING, RUNNING, COMPLETED, FAILED
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Table 7: quotations (AI-generated sales quotes)
CREATE TABLE IF NOT EXISTS quotations (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
    quote_number VARCHAR(100) UNIQUE NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    items JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table 8: approvals (Human-in-the-Loop manager approval tasks)
CREATE TABLE IF NOT EXISTS approvals (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
    quotation_id INTEGER REFERENCES quotations(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    approver VARCHAR(255),
    notes TEXT,
    suggested_reply TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    decided_at TIMESTAMP
);

-- Table 9: notifications (System Alerts and Unreads)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflows(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- EMAIL_RECEIVED, APPROVAL_REQUEST, SYSTEM_ERROR
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
