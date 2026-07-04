# Prompt templates for the Sales Operations Agent system.

EMAIL_CLASSIFICATION_PROMPT = """You are an intelligent Sales Operations agent.
Analyze the following email from a customer and classify its intent.

Subject: {subject}
Body: {body}

Choose from:
- SALES_INQUIRY: Client requests a quote, pricing, or product availability.
- SUPPORT: Client has issues, complaints, or technical questions.
- GENERAL_INFO: Unstructured greetings or general follow-ups.
- SPAM: Unrelated marketing or irrelevant emails.
"""

EXTRACTION_PROMPT = """You are a details extraction agent. Extract customer, product, and volume metadata from the email body.

Email:
{body}

Output a structured JSON containing:
- customer_name
- company
- product
- quantity
- confidence
"""

QUOTATION_EMAIL_TEMPLATE = """Dear {customer_name},

Thank you for contacting us regarding {product}.

We have prepared and generated quotation {quote_number} for {quantity} units.
The total amount comes to {total_amount} {currency}.

Our team will follow up with you in 3 days. Please let us know if you have any questions.

Best regards,
{sender_name}
Sales Operations Manager
"""
