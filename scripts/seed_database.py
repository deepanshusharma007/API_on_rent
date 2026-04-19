"""Database seeding script for initial data."""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.database.connection import SessionLocal
from backend.database.models import Plan, User, ProviderKey, ProviderType, UserRole
from backend.services.auth_utils import get_password_hash
from backend.config import settings


def seed_plans():
    """Create sample rental plans."""
    db = SessionLocal()
    
    plans_data = [
        {
            "name": "15 Min Flash",
            "description": "Perfect for quick tasks and testing",
            "price": 2.99,
            "duration_minutes": 15,
            "token_cap": 10000,
            "rpm_limit": 10,
            "drain_rate_multiplier": 1.0
        },
        {
            "name": "1 Hour Pro",
            "description": "Ideal for development and prototyping",
            "price": 9.99,
            "duration_minutes": 60,
            "token_cap": 50000,
            "rpm_limit": 30,
            "drain_rate_multiplier": 1.0
        },
        {
            "name": "24 Hour Enterprise",
            "description": "Full day access for production workloads",
            "price": 49.99,
            "duration_minutes": 1440,
            "token_cap": 500000,
            "rpm_limit": 100,
            "drain_rate_multiplier": 1.0
        },
        {
            "name": "GPT-4o Premium Hour",
            "description": "1 hour with GPT-4o (10x drain rate)",
            "price": 19.99,
            "duration_minutes": 60,
            "token_cap": 30000,
            "rpm_limit": 20,
            "drain_rate_multiplier": 10.0
        }
    ]
    
    for plan_data in plans_data:
        existing = db.query(Plan).filter(Plan.name == plan_data["name"]).first()
        if not existing:
            plan = Plan(**plan_data)
            db.add(plan)
            print(f"✅ Created plan: {plan_data['name']}")
    
    db.commit()
    db.close()


def seed_admin_user():
    """Create admin user."""
    db = SessionLocal()
    
    admin_email = settings.ADMIN_EMAIL
    existing_admin = db.query(User).filter(User.email == admin_email).first()
    
    if not existing_admin:
        admin = User(
            email=admin_email,
            hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
        db.commit()
        print(f"✅ Created admin user: {admin_email}")
    else:
        print(f"ℹ️  Admin user already exists: {admin_email}")
    
    db.close()


def seed_provider_keys():
    """Create mock provider keys."""
    db = SessionLocal()
    
    # Get keys from settings
    openai_keys = settings.get_openai_keys()
    gemini_keys = settings.get_gemini_keys()
    anthropic_keys = settings.get_anthropic_keys()
    
    # Add OpenAI keys
    for key in openai_keys:
        existing = db.query(ProviderKey).filter(ProviderKey.api_key == key).first()
        if not existing:
            provider_key = ProviderKey(
                provider=ProviderType.OPENAI,
                api_key=key,
                is_active=True
            )
            db.add(provider_key)
            print(f"✅ Added OpenAI key: {key[:20]}...")
    
    # Add Gemini keys
    for key in gemini_keys:
        existing = db.query(ProviderKey).filter(ProviderKey.api_key == key).first()
        if not existing:
            provider_key = ProviderKey(
                provider=ProviderType.GEMINI,
                api_key=key,
                is_active=True
            )
            db.add(provider_key)
            print(f"✅ Added Gemini key: {key[:20]}...")
    
    # Add Anthropic keys
    for key in anthropic_keys:
        existing = db.query(ProviderKey).filter(ProviderKey.api_key == key).first()
        if not existing:
            provider_key = ProviderKey(
                provider=ProviderType.ANTHROPIC,
                api_key=key,
                is_active=True
            )
            db.add(provider_key)
            print(f"✅ Added Anthropic key: {key[:20]}...")
    
    db.commit()
    db.close()


def main():
    """Run all seeding functions."""
    print("🌱 Seeding database...")
    seed_plans()
    seed_admin_user()
    seed_provider_keys()
    print("✅ Database seeding complete!")


if __name__ == "__main__":
    main()
