from abc import ABC, abstractmethod
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
    """Implementation of LLMProvider that targets Groq's API."""

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

    def generate(self, prompt: str, **kwargs: Any) -> str:
        messages = [{"role": "user", "content": prompt}]
        return self.chat(messages, **kwargs)

    def chat(self, messages: List[Dict[str, str]], **kwargs: Any) -> str:
        # Default to low temperature for stable function/tool-calling-like outputs
        temperature = kwargs.get("temperature", 0.1)
        model = kwargs.get("model", self.model_name)

        # Clean extra parameters
        clean_kwargs = {
            k: v for k, v in kwargs.items() if k not in ["model", "temperature"]
        }

        try:
            response = self.client.chat.completions.create(
                model=model, messages=messages, temperature=temperature, **clean_kwargs
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            return f"Error executing chat completion via GroqProvider: {str(e)}"


# Export a default provider instance
llm_provider = GroqProvider(
    api_key=settings.GROQ_API_KEY, model_name=settings.MODEL_NAME
)
