import sys
import os
from datetime import datetime, timedelta
import random

# Add parent directory to path to import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import SessionLocal, engine
from app.models.domain import Base, Customer, Device, IPAddress, PaymentMethod, Coupon, Merchant, Transaction

def seed_stealth_ring():
    db = SessionLocal()
    try:
        print("[+] Seeding Stealth Fraud Ring Cluster #C91 into PostgreSQL...")
        
        # 1. Ensure Merchant exists
        merchant = db.query(Merchant).filter(Merchant.id == "mch_tech_direct").first()
        if not merchant:
            merchant = Merchant(
                id="mch_tech_direct",
                name="TechShop Direct",
                category="electronics",
                risk_score=15.0
            )
            db.add(merchant)

        # 2. Shared Infrastructure Entities
        # Device 1 (primary botnet emulator hash)
        dev1 = db.query(Device).filter(Device.id == "dev_stealth_c91_primary").first()
        if not dev1:
            dev1 = Device(
                id="dev_stealth_c91_primary",
                fingerprint_hash="fp_emulator_android_v11_c91",
                device_type="mobile",
                os_name="Android 11"
            )
            db.add(dev1)

        # Device 2 (secondary botnet tablet hash)
        dev2 = db.query(Device).filter(Device.id == "dev_stealth_c91_secondary").first()
        if not dev2:
            dev2 = Device(
                id="dev_stealth_c91_secondary",
                fingerprint_hash="fp_emulator_tablet_v12_c91",
                device_type="tablet",
                os_name="Android 12"
            )
            db.add(dev2)

        # Shared Proxy IP
        ip1 = db.query(IPAddress).filter(IPAddress.id == "ip_stealth_c91_proxy").first()
        if not ip1:
            ip1 = IPAddress(
                id="ip_stealth_c91_proxy",
                ip_address="198.51.100.42",
                country_code="USA",
                asn="AS9921",
                is_proxy=True
            )
            db.add(ip1)

        # Shared Payment Method
        pm1 = db.query(PaymentMethod).filter(PaymentMethod.id == "pm_stealth_c91_card").first()
        if not pm1:
            pm1 = PaymentMethod(
                id="pm_stealth_c91_card",
                card_hash="hash_card_c91_stealth",
                card_bin="411111",
                card_type="CREDIT",
                issuer_country="USA"
            )
            db.add(pm1)

        # Shared Coupon
        cp1 = db.query(Coupon).filter(Coupon.id == "coupon_SAVE50").first()
        if not cp1:
            cp1 = Coupon(
                id="coupon_SAVE50",
                code="SAVE50",
                discount_percent=50,
                max_uses=1000,
                current_uses=38
            )
            db.add(cp1)

        db.commit()

        # 3. Create 14 Sybil Accounts
        customers = []
        for i in range(1, 15):
            cust_id = f"cust_stealth_{i:02d}"
            c = db.query(Customer).filter(Customer.id == cust_id).first()
            if not c:
                c = Customer(
                    id=cust_id,
                    email_domain="mail-temp-service.com",
                    account_created_at=datetime.utcnow() - timedelta(minutes=random.randint(10, 120)),
                    risk_score=35.0
                )
                db.add(c)
            customers.append(c)
        db.commit()

        # 4. Create 38 Transactions across the 14 customers
        tx_count = 0
        now = datetime.utcnow()

        for i in range(1, 39):
            tx_id = f"tx_stealth_{i:03d}"
            existing_tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
            if not existing_tx:
                cust = customers[(i - 1) % len(customers)]
                # Alternate between device 1 (majority) and device 2
                dev = dev1 if i % 4 != 0 else dev2
                
                # Timestamp spaced out closely over the last 90 minutes
                tx_time = now - timedelta(minutes=random.randint(2, 90))
                amt = round(random.uniform(14.99, 24.99), 2)  # Highly uniform amount

                tx = Transaction(
                    id=tx_id,
                    amount=amt,
                    currency="USD",
                    status="APPROVED",
                    merchant_id=merchant.id,
                    customer_id=cust.id,
                    device_id=dev.id,
                    ip_id=ip1.id,
                    payment_method_id=pm1.id,
                    coupon_id=cp1.id,
                    timestamp=tx_time,
                    is_fraud=False,       # Individual transaction labels appear benign/moderate
                    fraud_type="NORMAL"
                )
                db.add(tx)
                tx_count += 1

        db.commit()
        print(f"[+] Successfully seeded Stealth Fraud Ring #C91:")
        print(f"    - 14 Sybil Accounts")
        print(f"    - 2 Devices (dev_stealth_c91_primary, dev_stealth_c91_secondary)")
        print(f"    - 1 Proxy IP (198.51.100.42)")
        print(f"    - 1 Payment Method & 1 Coupon")
        print(f"    - {tx_count} Transactions (Amounts $14.99 - $24.99)")

    except Exception as e:
        db.rollback()
        print(f"[-] Error seeding stealth ring: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_stealth_ring()
