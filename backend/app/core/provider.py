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
            return self._generate_mock_decision(prompt)

    def _generate_mock_decision(self, prompt: str) -> str:
        """Determines the next workflow step deterministically based on prompt history details."""
        prompt_lower = prompt.lower()

        # Isolate parsing to the customer email block to avoid matching tool numbers (1, 2, 3, etc.)
        email_context = prompt_lower
        email_idx = prompt_lower.find("customer email:")
        if email_idx != -1:
            email_context = prompt_lower[email_idx:]

        # 1. Identify product from email context
        product = "Widget A"
        if "widget b" in email_context or "widget-b" in email_context:
            product = "Widget B"
        elif "widget c" in email_context or "widget-c" in email_context:
            product = "Widget C"
        elif "server rack" in email_context or "server-rack" in email_context:
            product = "Server Rack"

        # 2. Identify quantity from email context
        qty = 100
        qty_matches = re.findall(r"\b\d+\b", email_context)
        for q in qty_matches:
            num = int(q)
            if num not in [2026, 3000, 12]:  # Ignore year, cost threshold, step limit constants
                qty = num
                break

        # 3. Determine execution history
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
        has_crm = "- tool: crm_tool" in history_part
        has_calendar = "- tool: calendar_tool" in history_part

        has_approved_review = "result: approved" in history_part
        has_rejected_review = "result: rejected" in history_part

        # 4. Standard business policy calculations
        base_prices = {"Widget A": 10.0, "Widget B": 45.0, "Widget C": 120.0, "Server Rack": 850.0}
        base_price = base_prices.get(product, 25.0)

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

        decision = {}
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
                    "args": {"to_email": "customer@example.com", "subject": "Sales Quote", "body": email_body},
                    "confidence": 0.99,
                }
        elif not has_crm:
            decision = {
                "thought": "Creating a qualified lead deal value entry in our CRM backend database.",
                "tool": "crm_tool",
                "args": {
                    "customer_name": "Valued Customer",
                    "email": "customer@example.com",
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
                    "customer_email": "customer@example.com",
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
