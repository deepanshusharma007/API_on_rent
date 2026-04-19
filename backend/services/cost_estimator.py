"""Cost estimation service for API usage pricing."""
from typing import Dict, Optional


class CostEstimator:
    """Estimate costs for API requests."""
    
    # Pricing per 1M tokens (input/output)
    PRICING = {
        "gpt-4o": {"input": 2.50, "output": 10.00},
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
        "claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00},
        "gemini-1.5-pro": {"input": 1.25, "output": 5.00},
        "gemini-1.5-flash": {"input": 0.075, "output": 0.30},
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
    
    def estimate_request_cost(
        self, 
        messages: list, 
        model: str, 
        max_tokens: Optional[int] = None
    ) -> Dict:
        """
        Estimate cost before making a request.
        
        Args:
            messages: List of message dicts
            model: Model name
            max_tokens: Maximum tokens to generate
            
        Returns:
            Dict with estimated tokens and cost
        """
        # Rough estimation: 4 chars ≈ 1 token
        input_text = " ".join([msg.get("content", "") for msg in messages])
        estimated_input_tokens = len(input_text) // 4
        
        # Estimate output tokens
        estimated_output_tokens = max_tokens if max_tokens else 150
        
        # Calculate cost
        total_cost = self.estimate_cost(model, estimated_input_tokens, estimated_output_tokens)
        
        return {
            "input_tokens": estimated_input_tokens,
            "output_tokens": estimated_output_tokens,
            "total_tokens": estimated_input_tokens + estimated_output_tokens,
            "total_cost_usd": total_cost
        }
    
    def get_pricing(self, model: str) -> Optional[Dict]:
        """Get pricing information for a model."""
        return self.PRICING.get(model)
    
    @classmethod
    def list_all_pricing(cls) -> Dict[str, Dict[str, float]]:
        """Get all model pricing."""
        return cls.PRICING.copy()
