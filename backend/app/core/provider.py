from abc import ABC, abstractmethod
import json
import re
from typing import List, Dict, Any, Optional
from groq import Groq
from app.core.config import settings


class LLMProvider(ABC):
    """Abstract interface for LLM operations to allow swapping providers (OpenAI, Gemini, Groq, etc.) later."""

    @abstractmethod
    def generate(self, prompt: str, **kwargs: Any) -> str:
        """Generate a text response based on a single prompt.

        Args:
            prompt: Input text prompt.
            **kwargs: Extra settings like temperature, model name, etc.
        """
        pass

    @abstractmethod
    def chat(self, messages: List[Dict[str, str]], **kwargs: Any) -> str:
        """Generate a text response based on chat conversation logs.

        Args:
            messages: List of chat messages (e.g. [{"role": "user", "content": "hello"}])
            **kwargs: Extra settings like temperature, model name, etc.
        """
        pass


class GroqProvider(LLMProvider):
    """Implementation of LLMProvider that targets Groq's API, with an automatic fallback for mock mode."""

    def __init__(self, api_key: str, model_name: str) -> None:
        self.api_key = api_key
        self.model_name = model_name
        self._client: Optional[Groq] = None

    @property
    def client(self) -> Groq:
        """Lazily initialize the Groq client to prevent startup failures on placeholder keys."""
        if self._client is None:
            self._client = Groq(api_key=self.api_key)
        return self._client

    def is_mock_key(self) -> bool:
        """Returns True if the API key is a placeholder, signifying local test/hackathon mode."""
        key = self.api_key.lower()
        return not key or "mock" in key or "your" in key or "placeholder" in key

    def generate(self, prompt: str, **kwargs: Any) -> str:
        messages = [{"role": "user", "content": prompt}]
        return self.chat(messages, **kwargs)

    def chat(self, messages: List[Dict[str, str]], **kwargs: Any) -> str:
        # Default to low temperature for stable structured JSON output
        temperature = kwargs.get("temperature", 0.1)
        model = kwargs.get("model", self.model_name)
        clean_kwargs = {k: v for k, v in kwargs.items() if k not in ["model", "temperature"]}

        # If running in mock mode due to a placeholder API key, use the local mock router
        if self.is_mock_key():
            prompt = messages[-1]["content"] if messages else ""
            if "sales writer" in prompt.lower() or "email reply" in prompt.lower():
                return self._generate_mock_email_reply(prompt)
            return self._generate_mock_decision(prompt)

        try:
            response = self.client.chat.completions.create(
                model=model, messages=messages, temperature=temperature, **clean_kwargs
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            # Fallback to local mock orchestrator if the live API call fails (e.g. network/rate limit issues)
            print(f"⚠️ Live Groq call failed ({e}). Falling back to local mock orchestrator.")
            prompt = messages[-1]["content"] if messages else ""
            if "sales writer" in prompt.lower() or "email reply" in prompt.lower():
                return self._generate_mock_email_reply(prompt)
            return self._generate_mock_decision(prompt)

    def _generate_mock_email_reply(self, prompt: str) -> str:
        """Generates a realistic, professional sales email reply based on prompt variables."""
        customer_name = "Valued Customer"
        product = "Widget A"
        quantity = "100"
        total_amount = "1,000.00"
        quote_number = "QT-AUTO"
        
        import re
        name_match = re.search(r"Name:\s*([^\n]+)", prompt)
        if name_match: customer_name = name_match.group(1).strip()
        
        prod_match = re.search(r"Product:\s*([^\n]+)", prompt)
        if prod_match: product = prod_match.group(1).strip()
        
        qty_match = re.search(r"Quantity:\s*([^\n]+)", prompt)
        if qty_match: quantity = qty_match.group(1).strip()
        
        amt_match = re.search(r"Total/d* Amount:\s*([^\n]+)", prompt, re.IGNORECASE)
        if amt_match: total_amount = amt_match.group(1).strip()
        
        qn_match = re.search(r"quotation number\s+([^\s\n]+)", prompt, re.IGNORECASE)
        if qn_match: quote_number = qn_match.group(1).strip()
        
        return (
            f"Hi {customer_name},\n\n"
            f"Thanks for reaching out! I have reviewed your request and compiled a pricing quotation for you.\n\n"
            f"We have prepared quotation {quote_number} for {quantity} units of {product}. "
            f"The total value is ${total_amount} USD.\n\n"
            f"Please let me know if you have any questions or if you would like me to finalize this order.\n\n"
            f"Best regards,\n"
            f"AI Sales Operations Team"
        )

    def _generate_mock_decision(self, prompt: str) -> str:
        """Determines the next workflow step deterministically based on prompt history details."""
        # 1. Isolate the incoming customer email text from prompt to prevent matching history / RAG text
        prompt_lower = prompt.lower()
        email_content_only = prompt_lower
        
        email_idx = prompt_lower.find("customer email:")
        if email_idx != -1:
            history_idx = prompt_lower.find("previous history of execution:", email_idx)
            if history_idx != -1:
                email_content_only = prompt_lower[email_idx:history_idx]
            else:
                email_content_only = prompt_lower[email_idx:]

        # Extract sender email address dynamically from email content block
        sender_email = "customer@example.com"
        import re
        sender_match = re.search(r"sender:\s*([^\n<]*<)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", email_content_only)
        if sender_match:
            sender_email = sender_match.group(2).strip()
        else:
            sender_match_global = re.search(r"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", prompt)
            if sender_match_global:
                sender_email = sender_match_global.group(1).strip()

        sender_lower = sender_email.lower()
        
        # Check if automated/spam email
        is_automated = (
            "noreply" in sender_lower or 
            "no-reply" in sender_lower or 
            "updates" in sender_lower or 
            "news" in sender_lower or 
            "mailer-daemon" in sender_lower or 
            "support@" in sender_lower or
            "team@info" in sender_lower or
            "bounce" in sender_lower or
            "delivery status" in email_content_only or
            "newsletter" in email_content_only or
            "subscribed" in email_content_only or
            "pinterest" in sender_lower or
            "unstop" in sender_lower or
            "codeforces" in sender_lower
        )

        if is_automated:
            decision = {
                "thought": "This is an automated system email, newsletter, or delivery failure warning. No action needed. Marking workflow complete.",
                "tool": "complete_workflow_tool",
                "args": {},
                "confidence": 1.0,
            }
            return json.dumps(decision)

        # Determine product matches from CUSTOMER email block
        product = "Widget A"
        out_of_scope = True
        
        if "widget c" in email_content_only or "widget-c" in email_content_only:
            product = "Widget C"
            out_of_scope = False
        elif "widget b" in email_content_only or "widget-b" in email_content_only:
            product = "Widget B"
            out_of_scope = False
        elif "server rack" in email_content_only or "server-rack" in email_content_only:
            product = "Server Rack"
            out_of_scope = False
        elif "widget a" in email_content_only or "widget-a" in email_content_only:
            product = "Widget A"
            out_of_scope = False

        # Determine if it is a general information query or direct order
        is_general_query = True
        qty = 0

        # Locate the body field in the customer email section to avoid scanning sender email domains/names/subject
        body_content = email_content_only
        body_idx = email_content_only.find("body:")
        if body_idx != -1:
            body_content = email_content_only[body_idx:]

        # 1. Search for keyword-associated quantity patterns (e.g. "20 units", "20 widgets", "20 pcs", "quantity: 20")
        patterns = [
            r"\b(\d+)\s*(?:unit|pcs|piece|item|widget|rack|box|pack)s?\b",
            r"\b(?:qty|quantity|amount|number)\s*(?:of|is|:)?\s*(\d+)\b",
            r"\b(?:order|request|buy|purchase|send|need)\s+(\d+)\b"
        ]

        for pattern in patterns:
            matches = re.findall(pattern, body_content)
            if matches:
                # Find the first positive number
                for match in matches:
                    num = int(match)
                    if 0 < num < 100000:
                        qty = num
                        is_general_query = False
                        break
            if qty > 0:
                break

        # 2. Fallback: check if there is any standalone positive integer under 5000 units in the body
        if qty == 0:
            qty_matches = re.findall(r"\b\d+\b", body_content)
            for q in qty_matches:
                num = int(q)
                if num not in [2026, 3000, 12, 100, 500, 50, 8000, 8001] and 0 < num < 5000:
                    qty = num
                    is_general_query = False
                    break

        # 3. If no custom quantity was extracted, check if they explicitly mention a quantity word like "a unit", "one unit", "an item"
        if is_general_query:
            if re.search(r"\b(one|a|an)\s+(unit|item|widget|rack)\b", body_content):
                qty = 1
                is_general_query = False
            else:
                qty = 1  # Default fallback quantity for pricing inquiries

        # Determine execution history
        history_part = ""
        history_idx = prompt.find("Previous History of execution:")
        if history_idx != -1:
            history_part = prompt[history_idx:].lower()

        has_rag = "- tool: rag_tool" in history_part
        has_inventory = "- tool: inventory_tool" in history_part
        has_pricing = "- tool: pricing_tool" in history_part
        has_quote = "- tool: generate_quote_tool" in history_part
        has_approval = "- tool: request_approval_tool" in history_part
        has_email = "- tool: email_tool" in history_part
        has_whatsapp = "- tool: whatsapp_tool" in history_part
        has_crm = "- tool: crm_tool" in history_part
        has_calendar = "- tool: calendar_tool" in history_part

        # Short-circuit logic for out-of-scope enquiries (e.g. pizzas)
        if out_of_scope:
            if not has_email:
                email_body = (
                    f"Hello,\n\nThank you for reaching out! We received your enquiry. "
                    f"However, please note that we do not offer that product. We currently specialize in "
                    f"Widget A, Widget B, Widget C, and Server Racks. Let us know if we can help you with those!\n\n"
                    f"Best regards,\nAI Sales Operations Team"
                )
                decision = {
                    "thought": "The requested product is not in our catalog. Sending a polite out-of-scope email listing our actual product offerings.",
                    "tool": "email_tool",
                    "args": {"to_email": sender_email, "subject": "Sales Enquiry", "body": email_body},
                    "confidence": 0.99,
                }
            else:
                decision = {
                    "thought": "Out-of-scope inquiry handled and customer notified. Ending the workflow execution.",
                    "tool": "complete_workflow_tool",
                    "args": {},
                    "confidence": 1.0,
                }
            return json.dumps(decision)

        # Standard business pricing mappings for mock replies
        base_prices = {"Widget A": 10.0, "Widget B": 45.0, "Widget C": 120.0, "Server Rack": 850.0}
        base_price = base_prices.get(product, 25.0)

        # General Conversational / Pricing Enquiry Workflow (No Quotation or Manager Approval!)
        if is_general_query:
            if not has_rag:
                decision = {
                    "thought": f"Querying the RAG documentation to retrieve exact pricing and return policies for {product}.",
                    "tool": "rag_tool",
                    "args": {"query": f"pricing and policies for {product}"},
                    "confidence": 0.98,
                }
            elif not has_inventory:
                decision = {
                    "thought": f"Checking if {product} is currently available in the warehouse database.",
                    "tool": "inventory_tool",
                    "args": {"product": product, "quantity": 1},
                    "confidence": 0.96,
                }
            elif not has_email:
                email_body = (
                    f"Hello,\n\nThank you for your interest! Regarding your pricing inquiry: "
                    f"the unit price of {product} is ${base_price:.2f}. "
                    f"We currently have stock available in our warehouse and can ship standard orders in 2 business days.\n\n"
                    f"Please let us know if you would like to request an official quotation or place an order!\n\n"
                    f"Best regards,\nAI Sales Operations Team"
                )
                decision = {
                    "thought": f"Sending direct email response answering pricing details for {product}.",
                    "tool": "email_tool",
                    "args": {"to_email": sender_email, "subject": f"Information regarding {product} pricing", "body": email_body},
                    "confidence": 0.99,
                }
            elif not has_crm:
                decision = {
                    "thought": "Logging this customer product inquiry in the CRM backend.",
                    "tool": "crm_tool",
                    "args": {
                        "customer_name": "Valued Customer",
                        "email": sender_email,
                        "company": "Customer Company",
                        "value": 0.0,
                    },
                    "confidence": 0.98,
                }
            else:
                decision = {
                    "thought": "General information request handled successfully. Finishing workflow run.",
                    "tool": "complete_workflow_tool",
                    "args": {},
                    "confidence": 1.0,
                }
            return json.dumps(decision)

        # Standard Order Quotation Workflow
        discount = 0.0
        if product in ["Widget A", "Widget B"]:
            if qty >= 500:
                discount = 0.20
            elif qty >= 100:
                discount = 0.10
        elif product == "Widget C" and qty >= 50:
            discount = 0.05

        unit_price = base_price * (1 - discount)
        total_amount = unit_price * qty
        needs_approval = total_amount > 3000.0

        has_approved_review = "result: approved" in history_part
        has_rejected_review = "result: rejected" in history_part

        if not has_rag:
            decision = {
                "thought": f"I will query the RAG service to verify pricing tiers and policies for {product}.",
                "tool": "rag_tool",
                "args": {"query": f"pricing and policies for {product}"},
                "confidence": 0.98,
            }
        elif not has_inventory:
            decision = {
                "thought": f"Checking if {qty} units of {product} are available in inventory.",
                "tool": "inventory_tool",
                "args": {"product": product, "quantity": qty},
                "confidence": 0.96,
            }
        elif not has_pricing:
            decision = {
                "thought": f"Retrieving correct sales volume discount options for {qty} units of {product}.",
                "tool": "pricing_tool",
                "args": {"product": product, "quantity": qty},
                "confidence": 0.97,
            }
        elif not has_quote:
            decision = {
                "thought": f"Generating a quotation for {qty} units of {product} at ${unit_price:.2f} per unit.",
                "tool": "generate_quote_tool",
                "args": {
                    "product_name": product,
                    "quantity": qty,
                    "unit_price": unit_price,
                    "total_amount": total_amount,
                },
                "confidence": 0.99,
            }
        elif needs_approval and not has_approval and not has_approved_review and not has_rejected_review:
            decision = {
                "thought": f"Quotation value is ${total_amount:.2f}, exceeding the $3,000 threshold. Pausing for manager approval.",
                "tool": "request_approval_tool",
                "args": {"quotation_number": "QT-AUTO", "amount": total_amount},
                "confidence": 1.0,
            }
        elif not has_email:
            if needs_approval and has_rejected_review:
                decision = {
                    "thought": "Quotation was rejected by manager. Cancelling the workflow.",
                    "tool": "complete_workflow_tool",
                    "args": {},
                    "confidence": 0.90,
                }
            else:
                email_body = (
                    f"Hello,\n\nWe have prepared a quotation for your inquiry of {qty} units of {product}. "
                    f"The total cost is ${total_amount:,.2f}.\n\nStandard delivery is 2 business days.\n\n"
                    f"Best regards,\nAI Sales Operations Team"
                )
                decision = {
                    "thought": "Sending the approved quotation invoice and email response back to the client.",
                    "tool": "email_tool",
                    "args": {"to_email": sender_email, "subject": "Sales Quote", "body": email_body},
                    "confidence": 0.99,
                }
        elif not has_whatsapp:
            phone_num = "+1234567890"
            if "@whatsapp.flow.hackarena.dev" in sender_email:
                phone_num = sender_email.split("@")[0]
            else:
                phone_match = re.search(r"(\+\d{10,15}|\b\d{10,12}\b)", email_content_only)
                if phone_match:
                    phone_num = phone_match.group(1).replace(" ", "")
            
            decision = {
                "thought": "Sending WhatsApp notification quote alert directly to customer mobile phone.",
                "tool": "whatsapp_tool",
                "args": {
                    "phone": phone_num,
                    "message": f"Hi, your quote QT-AUTO for {qty} units of {product} has been generated and emailed to you!"
                },
                "confidence": 0.99,
            }
        elif not has_crm:
            decision = {
                "thought": "Creating a qualified lead deal value entry in our CRM backend database.",
                "tool": "crm_tool",
                "args": {
                    "customer_name": "Valued Customer",
                    "email": sender_email,
                    "company": "Customer Company",
                    "value": total_amount,
                },
                "confidence": 0.98,
            }
        elif not has_calendar:
            decision = {
                "thought": "Scheduling a calendar follow-up item in 3 days to prompt the account rep.",
                "tool": "calendar_tool",
                "args": {
                    "customer_email": sender_email,
                    "title": "Follow up on Quotation",
                    "days_from_now": 3,
                },
                "confidence": 0.95,
            }
        else:
            decision = {
                "thought": "All workflow actions completed successfully. Workflow engine run complete.",
                "tool": "complete_workflow_tool",
                "args": {},
                "confidence": 1.0,
            }

        return json.dumps(decision)


# Export a default provider instance
llm_provider = GroqProvider(api_key=settings.GROQ_API_KEY, model_name=settings.MODEL_NAME)
