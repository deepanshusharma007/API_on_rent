"""Quick script to create admin user manually."""
from backend.database.connection import SessionLocal, init_db
from backend.database.models import User, UserRole
from backend.services.auth_utils import hash_password

# Initialize database
init_db()

# Create session
db = SessionLocal()

# Check if admin exists
admin = db.query(User).filter(User.email == "admin@apirental.com").first()

if admin:
    print(f"✅ Admin user already exists: {admin.email}")
    print(f"   Active: {admin.is_active}")
    print(f"   Role: {admin.role}")
else:
    # Create admin user
    admin = User(
        email="admin@apirental.com",
        hashed_password=hash_password("admin123"),
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin)
    db.commit()
    print(f"✅ Created admin user: {admin.email}")

db.close()
print("\n🎉 Admin user ready!")
print("Email: admin@apirental.com")
print("Password: admin123")
