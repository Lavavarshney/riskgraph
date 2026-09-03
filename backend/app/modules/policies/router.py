from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.core.database import get_db, engine
from app.models.domain import MerchantPolicy, Base
from app.modules.policies.schemas import MerchantPolicySchema, MerchantPolicyCreate, MerchantPolicyUpdate

router = APIRouter(prefix="/policies", tags=["Merchant Policies"])

def get_default_policy(db: Session) -> MerchantPolicy:
    try:
        Base.metadata.create_all(bind=engine, tables=[MerchantPolicy.__table__])
    except Exception:
        pass
        
    policy = db.query(MerchantPolicy).first()
    if not policy:
        policy = MerchantPolicy(
            id=f"pol_{uuid.uuid4().hex[:12]}",
            name="Default Merchant Policy"
        )
        db.add(policy)
        db.commit()
        db.refresh(policy)
    return policy

@router.get("", response_model=List[MerchantPolicySchema])
def list_policies(db: Session = Depends(get_db)):
    policy = get_default_policy(db)
    return [policy]

@router.post("", response_model=MerchantPolicySchema)
def create_policy(policy_in: MerchantPolicyCreate, db: Session = Depends(get_db)):
    try:
        Base.metadata.create_all(bind=engine, tables=[MerchantPolicy.__table__])
    except Exception:
        pass
        
    policy = MerchantPolicy(id=f"pol_{uuid.uuid4().hex[:12]}", **policy_in.dict())
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy

@router.put("/{policy_id}", response_model=MerchantPolicySchema)
def update_policy(policy_id: str, policy_in: MerchantPolicyUpdate, db: Session = Depends(get_db)):
    policy = db.query(MerchantPolicy).filter(MerchantPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
        
    update_data = policy_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(policy, key, value)
        
    db.commit()
    db.refresh(policy)
    return policy
