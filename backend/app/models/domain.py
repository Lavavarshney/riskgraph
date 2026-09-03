from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Numeric, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(String(64), primary_key=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    risk_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("Transaction", back_populates="merchant")

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(64), primary_key=True)
    email_domain = Column(String(100), nullable=False)
    account_created_at = Column(DateTime, default=datetime.utcnow)
    risk_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("Transaction", back_populates="customer")

class Device(Base):
    __tablename__ = "devices"

    id = Column(String(64), primary_key=True)
    fingerprint_hash = Column(String(64), nullable=False)
    device_type = Column(String(50), nullable=False)
    os_name = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("Transaction", back_populates="device")

class IPAddress(Base):
    __tablename__ = "ip_addresses"

    id = Column(String(64), primary_key=True)
    ip_address = Column(String(45), nullable=False)
    country_code = Column(String(3), nullable=False)
    is_proxy = Column(Boolean, default=False)
    asn = Column(String(50), default="AS15169")
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("Transaction", back_populates="ip")

class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id = Column(String(64), primary_key=True)
    card_hash = Column(String(64), nullable=False)
    card_bin = Column(String(8), nullable=False)
    card_type = Column(String(30), default="CREDIT")
    issuer_country = Column(String(3), default="USA")
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("Transaction", back_populates="payment_method")

class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(String(64), primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    discount_percent = Column(Integer, default=15)
    max_uses = Column(Integer, default=1000)
    current_uses = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("Transaction", back_populates="coupon")

class FraudCluster(Base):
    __tablename__ = "fraud_clusters"

    id = Column(String(64), primary_key=True)
    cluster_name = Column(String(100), nullable=False)
    severity = Column(String(20), nullable=False)
    pattern_type = Column(String(50), nullable=False)
    affected_merchants = Column(Integer, default=0)
    affected_cards = Column(Integer, default=0)
    status = Column(String(20), default="ACTIVE")
    detected_at = Column(DateTime, default=datetime.utcnow)

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(64), primary_key=True)
    merchant_id = Column(String(64), ForeignKey("merchants.id"), nullable=False)
    customer_id = Column(String(64), ForeignKey("customers.id"), nullable=False)
    device_id = Column(String(64), ForeignKey("devices.id"), nullable=False)
    ip_id = Column(String(64), ForeignKey("ip_addresses.id"), nullable=False)
    payment_method_id = Column(String(64), ForeignKey("payment_methods.id"), nullable=False)
    coupon_id = Column(String(64), ForeignKey("coupons.id"), nullable=True)

    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD")
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String(30), default="APPROVED")
    payment_attempt_number = Column(Integer, default=1)
    failed_attempts_recent = Column(Integer, default=0)
    account_age_minutes = Column(Integer, default=1440)
    country = Column(String(3), default="USA")

    is_fraud = Column(Boolean, default=False)
    fraud_type = Column(String(50), default="NORMAL")

    # Relationships
    merchant = relationship("Merchant", back_populates="transactions")
    customer = relationship("Customer", back_populates="transactions")
    device = relationship("Device", back_populates="transactions")
    ip = relationship("IPAddress", back_populates="transactions")
    payment_method = relationship("PaymentMethod", back_populates="transactions")
    coupon = relationship("Coupon", back_populates="transactions")

class ActionLog(Base):
    __tablename__ = "action_logs"

    id = Column(String(64), primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    cluster_id = Column(String(64), nullable=False)
    action = Column(String(50), nullable=False)      # e.g., QUARANTINE_DEVICE, DISABLE_COUPON, QUARANTINE_IP
    target = Column(String(128), nullable=False)     # e.g., dev_stealth_c91_primary
    reason = Column(String(255), nullable=False)
    policy_id = Column(String(64), default="POL_CONTAIN_AUTO_v1")
    result = Column(String(50), default="SUCCESS")

class MerchantPolicy(Base):
    __tablename__ = "merchant_policies"

    id = Column(String(64), primary_key=True)
    name = Column(String(255), default="Default Merchant Policy")
    individual_risk_threshold = Column(Float, default=80.0)
    network_risk_threshold = Column(Float, default=85.0)
    auto_block_enabled = Column(Boolean, default=True)
    auto_challenge_enabled = Column(Boolean, default=True)
    device_quarantine_threshold = Column(Integer, default=8)
    ip_quarantine_threshold = Column(Integer, default=10)
    minimum_account_age_for_auto_block = Column(Integer, default=0)
    maximum_transaction_amount_for_auto_block = Column(Numeric(12, 2), default=1000.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

