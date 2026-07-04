from abc import ABC, abstractmethod
import re
from typing import Any, Dict
from app.core.provider import LLMProvider, llm_provider


class AgentPlanner(ABC):
    """Abstract interface for our agent planner/decision-maker."""

    @abstractmethod
    def plan(self, email_body: str) -> Dict[str, Any]:
        """Analyzes an inbound email to plan the workflow response.

        Args:
            email_body: Raw text content of the customer's email.

        Returns:
            A dictionary containing intent, extracted information, and next execution steps.
        """
        pass


class MockAgentPlanner(AgentPlanner):
    """Deterministic agent planner used during the initial hackathon bootstrap.

    Allows testable execution paths without consuming live API tokens.
    """

    def __init__(self, provider: LLMProvider) -> None:
        # Save provider reference for future live integration
        self.provider = provider

    def plan(self, email_body: str) -> Dict[str, Any]:
        body_lower = email_body.lower()

        # Deterministic extraction logic based on keywords
        product = "Widget A"
        quantity = 100
        confidence = 0.95

        if "widget-b" in body_lower or "widget b" in body_lower:
            product = "Widget B"
            quantity = 50
            confidence = 0.92
        elif "widget-c" in body_lower or "widget c" in body_lower:
            product = "Widget C"
            quantity = 10
            confidence = 0.88
        elif "server-rack" in body_lower or "server rack" in body_lower:
            product = "Server Rack"
            quantity = 5
            confidence = 0.97

        # Extract first positive integer found in text for quantity
        digits = re.findall(r"\b\d+\b", body_lower)
        if digits:
            try:
                quantity = int(digits[0])
            except ValueError:
                pass

        return {
            "intent": "SALES_INQUIRY",
            "extracted_info": {
                "product": product,
                "quantity": quantity,
                "confidence": confidence,
            },
            "confidence": confidence,
            "next_step": "RETRIEVE_PRICING",
            "notes": "Plan generated deterministically by MockAgentPlanner.",
        }
