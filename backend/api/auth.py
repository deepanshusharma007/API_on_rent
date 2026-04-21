"""Authentication API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.database.models import User, UserRole
from backend.api.schemas import UserRegister, UserLogin, Token, UserResponse
from backend.services.auth_utils import verify_password, hash_password, create_access_token
from backend.api.dependencies import get_current_user

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Create account", description="Register a new user account. Returns user info (no token — call /auth/login next).")
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user."""
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    hashed_password = hash_password(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        role=UserRole.USER,
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create Stripe customer (best-effort — don't block registration)
    try:
        import stripe
        from backend.config import settings
        stripe.api_key = settings.STRIPE_SECRET_KEY
        if stripe.api_key and not stripe.api_key.startswith("sk_test_mock"):
            customer = stripe.Customer.create(
                email=user_data.email,
                metadata={"user_id": str(new_user.id)}
            )
            # Could store customer.id on user model if needed
    except Exception:
        pass  # Stripe is optional at registration time

    return new_user


@router.post("/login", response_model=Token, summary="Login", description="Authenticate with email and password. Returns a JWT access token valid for 24 hours.")
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login and get JWT token."""
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value}
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse, summary="Get current user", description="Returns the authenticated user's profile. Requires `Authorization: Bearer <jwt_token>`.")
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return current_user


@router.post("/refresh", response_model=Token, summary="Refresh token", description="Issue a fresh JWT token using the current valid token. Useful before expiry.")
def refresh_token(current_user: User = Depends(get_current_user)):
    """Refresh JWT token."""
    access_token = create_access_token(
        data={"sub": str(current_user.id), "email": current_user.email, "role": current_user.role.value}
    )
    return {"access_token": access_token, "token_type": "bearer"}
