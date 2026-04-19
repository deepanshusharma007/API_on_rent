"""PII (Personally Identifiable Information) masking service."""
import re
from backend.config import settings


def mask_pii(text: str) -> str:
    """
    Mask PII in text content.
    
    Args:
        text: Input text that may contain PII
        
    Returns:
        Text with PII masked
    """
    if not settings.PII_MASKING_ENABLED:
        return text
    
    masked_text = text
    
    # Mask email addresses
    if settings.PII_MASK_EMAILS:
        masked_text = re.sub(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            '[EMAIL_REDACTED]',
            masked_text
        )
    
    # Mask phone numbers (various formats)
    if settings.PII_MASK_PHONES:
        # US phone numbers
        masked_text = re.sub(
            r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
            '[PHONE_REDACTED]',
            masked_text
        )
        # International format
        masked_text = re.sub(
            r'\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}',
            '[PHONE_REDACTED]',
            masked_text
        )
    
    # Mask SSN (Social Security Numbers)
    if settings.PII_MASK_SSNS:
        masked_text = re.sub(
            r'\b\d{3}-\d{2}-\d{4}\b',
            '[SSN_REDACTED]',
            masked_text
        )
    
    # Mask credit card numbers
    if settings.PII_MASK_CREDIT_CARDS:
        masked_text = re.sub(
            r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
            '[CARD_REDACTED]',
            masked_text
        )
    
    return masked_text


def mask_messages(messages: list) -> list:
    """
    Mask PII in message list.
    
    Args:
        messages: List of message dicts with 'content' field
        
    Returns:
        Messages with PII masked in content
    """
    if not settings.PII_MASKING_ENABLED:
        return messages
    
    masked_messages = []
    for msg in messages:
        masked_msg = msg.copy()
        if 'content' in masked_msg and isinstance(masked_msg['content'], str):
            masked_msg['content'] = mask_pii(masked_msg['content'])
        masked_messages.append(masked_msg)
    
    return masked_messages
