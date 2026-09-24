"""Teams & RBAC API — team CRUD, membership, internal key issuance."""
import json
import secrets
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.database.models import (
    Team, TeamMember, TeamMemberRole, InternalKey, User, UserRole
)
from backend.api.dependencies import get_current_admin, get_current_user

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None
    allowed_models: List[str] = []
    rpm_limit: int = 60
    token_budget: int = 0  # 0 = unlimited


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    allowed_models: Optional[List[str]] = None
    rpm_limit: Optional[int] = None
    token_budget: Optional[int] = None
    is_active: Optional[bool] = None


class MemberAdd(BaseModel):
    user_id: int
    role: TeamMemberRole = TeamMemberRole.MEMBER


class InternalKeyCreate(BaseModel):
    user_id: int
    label: Optional[str] = None
    token_budget: int = 0   # 0 = inherit team limit
    rpm_limit: int = 0      # 0 = inherit team limit
    expires_at: Optional[datetime] = None


def _team_out(team: Team) -> dict:
    return {
        "id": team.id,
        "name": team.name,
        "description": team.description,
        "allowed_models": json.loads(team.allowed_models or "[]"),
        "rpm_limit": team.rpm_limit,
        "token_budget": team.token_budget,
        "is_active": team.is_active,
        "member_count": len(team.members),
        "key_count": len(team.internal_keys),
        "created_at": team.created_at.isoformat(),
    }


def _member_out(m: TeamMember) -> dict:
    return {
        "id": m.id,
        "user_id": m.user_id,
        "email": m.user.email if m.user else None,
        "role": m.role.value,
        "created_at": m.created_at.isoformat(),
    }


def _key_out(k: InternalKey) -> dict:
    return {
        "id": k.id,
        "virtual_key": k.virtual_key,
        "label": k.label,
        "user_id": k.user_id,
        "user_email": k.user.email if k.user else None,
        "team_id": k.team_id,
        "token_budget": k.token_budget,
        "tokens_used": k.tokens_used,
        "rpm_limit": k.rpm_limit,
        "is_active": k.is_active,
        "expires_at": k.expires_at.isoformat() if k.expires_at else None,
        "created_at": k.created_at.isoformat(),
    }


# ── Admin: Team CRUD ─────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_team(
    body: TeamCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if db.query(Team).filter(Team.name == body.name).first():
        raise HTTPException(status_code=400, detail="Team name already exists")
    team = Team(
        name=body.name,
        description=body.description,
        created_by=admin.id,
        allowed_models=json.dumps(body.allowed_models),
        rpm_limit=body.rpm_limit,
        token_budget=body.token_budget,
    )
    db.add(team)
    db.commit()
    db.refresh(team)
    return _team_out(team)


@router.get("")
async def list_teams(
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    teams = db.query(Team).all()
    return {"teams": [_team_out(t) for t in teams]}


@router.get("/{team_id}")
async def get_team(
    team_id: int,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return {
        **_team_out(team),
        "members": [_member_out(m) for m in team.members],
        "keys": [_key_out(k) for k in team.internal_keys],
    }


@router.put("/{team_id}")
async def update_team(
    team_id: int,
    body: TeamUpdate,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if body.name is not None:
        team.name = body.name
    if body.description is not None:
        team.description = body.description
    if body.allowed_models is not None:
        team.allowed_models = json.dumps(body.allowed_models)
    if body.rpm_limit is not None:
        team.rpm_limit = body.rpm_limit
    if body.token_budget is not None:
        team.token_budget = body.token_budget
    if body.is_active is not None:
        team.is_active = body.is_active
    db.commit()
    db.refresh(team)
    return _team_out(team)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: int,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    db.delete(team)
    db.commit()


# ── Admin: Membership ────────────────────────────────────────────────────────

@router.post("/{team_id}/members", status_code=status.HTTP_201_CREATED)
async def add_member(
    team_id: int,
    body: MemberAdd,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    existing = db.query(TeamMember).filter(
        TeamMember.team_id == team_id, TeamMember.user_id == body.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already in team")
    m = TeamMember(team_id=team_id, user_id=body.user_id, role=body.role)
    db.add(m)
    db.commit()
    db.refresh(m)
    return _member_out(m)


@router.delete("/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    team_id: int,
    user_id: int,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    m = db.query(TeamMember).filter(
        TeamMember.team_id == team_id, TeamMember.user_id == user_id
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(m)
    db.commit()


# ── Admin: Internal Key Issuance ─────────────────────────────────────────────

@router.post("/{team_id}/keys", status_code=status.HTTP_201_CREATED)
async def issue_internal_key(
    team_id: int,
    body: InternalKeyCreate,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    vk = "ik_" + secrets.token_urlsafe(32)
    key = InternalKey(
        user_id=body.user_id,
        team_id=team_id,
        virtual_key=vk,
        label=body.label,
        token_budget=body.token_budget,
        rpm_limit=body.rpm_limit,
        expires_at=body.expires_at,
    )
    db.add(key)
    db.commit()
    db.refresh(key)
    return _key_out(key)


@router.delete("/{team_id}/keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_internal_key(
    team_id: int,
    key_id: int,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    key = db.query(InternalKey).filter(
        InternalKey.id == key_id, InternalKey.team_id == team_id
    ).first()
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    key.is_active = False
    db.commit()


# ── User: view own team ───────────────────────────────────────────────────────

@router.get("/my/team")
async def get_my_team(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the team(s) the current user belongs to, with allowed models."""
    memberships = db.query(TeamMember).filter(TeamMember.user_id == current_user.id).all()
    if not memberships:
        return {"teams": []}
    result = []
    for m in memberships:
        team = m.team
        if team and team.is_active:
            result.append({
                "id": team.id,
                "name": team.name,
                "role": m.role.value,
                "allowed_models": json.loads(team.allowed_models or "[]"),
                "rpm_limit": team.rpm_limit,
                "token_budget": team.token_budget,
            })
    return {"teams": result}
