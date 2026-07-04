from typing import List, Dict, Any

STAGES: List[str] = [
    "EMAIL_RECEIVED",
    "UNDERSTAND_REQUEST",
    "EXTRACT_INFORMATION",
    "RETRIEVE_PRICING",
    "CHECK_INVENTORY",
    "GENERATE_QUOTATION",
    "REQUEST_APPROVAL",
    "SEND_REPLY",
    "CREATE_LEAD",
    "SCHEDULE_FOLLOWUP",
    "COMPLETED",
]

STAGE_DETAILS: Dict[str, Dict[str, Any]] = {
    "EMAIL_RECEIVED": {
        "title": "Email Received",
        "description": "Inbound customer email is successfully parsed and logged.",
        "icon": "mail",
    },
    "UNDERSTAND_REQUEST": {
        "title": "Understand Request",
        "description": "AI Planner determines user intent and confirms routing.",
        "icon": "brain",
    },
    "EXTRACT_INFORMATION": {
        "title": "Extract Details",
        "description": "Extracts customer, product name, and quantities.",
        "icon": "user-check",
    },
    "RETRIEVE_PRICING": {
        "title": "Retrieve Pricing",
        "description": "Queries pricing sheets and active sales policies.",
        "icon": "dollar-sign",
    },
    "CHECK_INVENTORY": {
        "title": "Check Inventory",
        "description": "Verifies stock availability inside warehouse database.",
        "icon": "package",
    },
    "GENERATE_QUOTATION": {
        "title": "Generate Quotation",
        "description": "Drafts the sales quotation with line items.",
        "icon": "file-text",
    },
    "REQUEST_APPROVAL": {
        "title": "Request Approval",
        "description": "Pauses workflow and routes to manager for human-in-the-loop review.",
        "icon": "shield-alert",
    },
    "SEND_REPLY": {
        "title": "Send Reply",
        "description": "Emails the official PDF quotation draft back to the client.",
        "icon": "send",
    },
    "CREATE_LEAD": {
        "title": "Create Lead",
        "description": "Registers client profile and deal size in company CRM.",
        "icon": "database",
    },
    "SCHEDULE_FOLLOWUP": {
        "title": "Schedule Follow-up",
        "description": "Creates a task calendar invite to prompt the account rep.",
        "icon": "calendar",
    },
    "COMPLETED": {
        "title": "Workflow Completed",
        "description": "The lifecycle of this enquiry is complete.",
        "icon": "check-circle",
    },
}
