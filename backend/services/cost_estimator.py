"""Cost estimation service for API usage pricing."""

class CostEstimator:
    """Estimate costs for API requests."""
    
    # Pricing per 1M tokens (input/output)
    PRICING = {
        "gpt-4o": {"input": 2.50, "output": 10.00},
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
        "claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00},
        "claude-sonnet-5-5": {"input": 2.00, "output": 10.00},
        "claude-haiku-5-5": {"input": 0.10, "output": 0.50},  # prompts up to 100K tokens
        "claude-opus-4-8": {"input": 5.00, "output": 25.00},
        "gemini-1.5-pro": {"input": 1.25, "output": 5.00},
        "gemini-1.5-flash": {"input": 0.075, "output": 0.30},
        # Rest of the gateway catalogue (list prices, USD per 1M tokens)
        "gpt-4-turbo": {"input": 10.00, "output": 30.00},
        "gpt-4": {"input": 30.00, "output": 60.00},
        "o1": {"input": 15.00, "output": 60.00},
        "o1-mini": {"input": 3.00, "output": 12.00},
        "o3-mini": {"input": 1.10, "output": 4.40},
        "gemini-2.0-flash": {"input": 0.10, "output": 0.40},
        "gemini-1.0-pro": {"input": 0.50, "output": 1.50},
    }
    
    def estimate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """
        Estimate cost for a completed request.
        
        Args:
            model: Model name
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            
        Returns:
            Estimated cost in USD
        """
        pricing = self.PRICING.get(model, {"input": 1.0, "output": 2.0})
        
        input_cost = (input_tokens / 1_000_000) * pricing["input"]
        output_cost = (output_tokens / 1_000_000) * pricing["output"]
        
        return input_cost + output_cost
    
