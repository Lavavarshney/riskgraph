import sys
import os
import random
import time
import uuid
from datetime import datetime, timedelta
from typing import List, Dict

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.core.database import Base, engine, SessionLocal
from app.models.domain import (
    Merchant,
    Customer,
    Device,
    IPAddress,
    PaymentMethod,
    Coupon,
    FraudCluster,
    Transaction
)

print("Starting RISKGRAPH Synthetic Data Generator...")

# Configuration sizes
MERCHANT_COUNT = 100
CUSTOMER_COUNT = 20000
DEVICE_COUNT = 5000
IP_COUNT = 4000
PAYMENT_METHOD_COUNT = 15000
COUPON_COUNT = 100
TOTAL_TRANSACTIONS = 100000

BATCH_SIZE = 5000

def seed_database():
    start_time = time.time()

    # Re-create database tables safely across PostgreSQL and SQLite
    if "postgresql" in str(engine.url):
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
            conn.commit()
    else:
        Base.metadata.drop_all(bind=engine)

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # 1. Seed Merchants
        print(f"Generating {MERCHANT_COUNT} Merchants...")
        categories = ["Electronics", "Apparel & Fashion", "Digital Goods & SaaS", "Travel & Gaming", "Luxury & Jewelry"]
        merchant_objs = []
        for i in range(1, MERCHANT_COUNT + 1):
            m_id = f"mch_{i}"
            category = random.choice(categories)
            name = f"Merchant {i} - {category}"
            merchant_objs.append(Merchant(
                id=m_id,
                name=name,
                category=category,
                risk_score=round(random.uniform(0.01, 0.15), 2),
                created_at=datetime.utcnow() - timedelta(days=random.randint(30, 365))
            ))
        db.bulk_save_objects(merchant_objs)
        db.commit()

        # 2. Seed Customers
        print(f"Generating {CUSTOMER_COUNT} Customers...")
        domains = ["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "proton.me", "tempmail.org"]
        customer_objs = []
        for i in range(1, CUSTOMER_COUNT + 1):
            c_id = f"cust_{i}"
            domain = random.choice(domains)
            customer_objs.append(Customer(
                id=c_id,
                email_domain=domain,
                account_created_at=datetime.utcnow() - timedelta(days=random.randint(1, 730)),
                risk_score=0.0,
                created_at=datetime.utcnow()
            ))
        db.bulk_save_objects(customer_objs)
        db.commit()

        # 3. Seed Devices
        print(f"Generating {DEVICE_COUNT} Devices...")
        device_types = ["mobile_ios", "mobile_android", "desktop_windows", "desktop_mac", "tablet"]
        os_list = ["iOS 17", "Android 14", "Windows 11", "macOS Sonoma", "Linux"]
        device_objs = []
        for i in range(1, DEVICE_COUNT + 1):
            d_id = f"dev_{i}"
            device_objs.append(Device(
                id=d_id,
                fingerprint_hash=f"fp_hash_{uuid.uuid4().hex[:12]}",
                device_type=random.choice(device_types),
                os_name=random.choice(os_list),
                created_at=datetime.utcnow()
            ))
        db.bulk_save_objects(device_objs)
        db.commit()

        # 4. Seed IP Addresses
        print(f"Generating {IP_COUNT} IP Addresses...")
        countries = ["USA", "CAN", "GBR", "DEU", "FRA", "BRA", "IND", "NGA", "ROU", "SGP"]
        ip_objs = []
        for i in range(1, IP_COUNT + 1):
            ip_id = f"ip_{i}"
            octet1 = random.choice([198, 203, 192, 45, 185, 104])
            octet2 = random.randint(0, 255)
            octet3 = random.randint(0, 255)
            octet4 = random.randint(1, 254)
            ip_str = f"{octet1}.{octet2}.{octet3}.{octet4}"
            is_proxy = random.random() < 0.08
            ip_objs.append(IPAddress(
                id=ip_id,
                ip_address=ip_str,
                country_code=random.choice(countries),
                is_proxy=is_proxy,
                asn=f"AS{random.randint(1000, 50000)}",
                created_at=datetime.utcnow()
            ))
        db.bulk_save_objects(ip_objs)
        db.commit()

        # 5. Seed Payment Methods
        print(f"Generating {PAYMENT_METHOD_COUNT} Payment Methods...")
        bins = ["411111", "550000", "378282", "400000", "510000", "424242"]
        types = ["CREDIT", "DEBIT", "PREPAID"]
        pm_objs = []
        for i in range(1, PAYMENT_METHOD_COUNT + 1):
            pm_id = f"pm_{i}"
            pm_objs.append(PaymentMethod(
                id=pm_id,
                card_hash=f"card_hash_{uuid.uuid4().hex[:14]}",
                card_bin=random.choice(bins),
                card_type=random.choice(types),
                issuer_country=random.choice(countries),
                created_at=datetime.utcnow()
            ))
        db.bulk_save_objects(pm_objs)
        db.commit()

        # 6. Seed Coupons
        print(f"Generating {COUPON_COUNT} Coupons...")
        coupon_objs = []
        for i in range(1, COUPON_COUNT + 1):
            cpn_id = f"cpn_{i}"
            coupon_objs.append(Coupon(
                id=cpn_id,
                code=f"SAVE_{i}_PROMO",
                discount_percent=random.choice([10, 15, 20, 25, 50]),
                max_uses=1000,
                current_uses=random.randint(10, 800),
                created_at=datetime.utcnow()
            ))
        db.bulk_save_objects(coupon_objs)
        db.commit()

        # 7. Seed Fraud Clusters
        print("Generating Fraud Clusters metadata...")
        cluster_objs = [
            FraudCluster(id="fc_1", cluster_name="Card Testing Ring Alpha", severity="HIGH", pattern_type="CARD_TESTING", affected_merchants=6, affected_cards=340, status="ACTIVE"),
            FraudCluster(id="fc_2", cluster_name="Account Farm East", severity="MEDIUM", pattern_type="ACCOUNT_FARM", affected_merchants=12, affected_cards=180, status="ACTIVE"),
            FraudCluster(id="fc_3", cluster_name="Proxy ATO Cluster", severity="CRITICAL", pattern_type="ACCOUNT_TAKEOVER", affected_merchants=4, affected_cards=95, status="ACTIVE"),
            FraudCluster(id="fc_4", cluster_name="Coordinated Ring Omega", severity="CRITICAL", pattern_type="FRAUD_RING", affected_merchants=18, affected_cards=520, status="ACTIVE"),
            FraudCluster(id="fc_5", cluster_name="Coupon Abuse Blitz", severity="LOW", pattern_type="COUPON_ABUSE", affected_merchants=3, affected_cards=110, status="ACTIVE")
        ]
        db.bulk_save_objects(cluster_objs)
        db.commit()

        # 8. Seed 100,000 Transactions with realistic pattern distributions
        print(f"Generating {TOTAL_TRANSACTIONS} Transactions...")

        # Designated suspicious pools for graph relationships
        card_testing_ips = [f"ip_{i}" for i in range(1, 20)]
        card_testing_devices = [f"dev_{i}" for i in range(1, 20)]
        
        farm_ips = [f"ip_{i}" for i in range(21, 50)]
        farm_devices = [f"dev_{i}" for i in range(21, 50)]

        ring_customers = [f"cust_{i}" for i in range(100, 300)]
        ring_devices = [f"dev_{i}" for i in range(51, 100)]
        ring_ips = [f"ip_{i}" for i in range(51, 100)]
        ring_pms = [f"pm_{i}" for i in range(100, 400)]

        coupon_abuse_cpn = "cpn_1"

        tx_objs = []
        base_time = datetime.utcnow() - timedelta(days=14)

        for i in range(1, TOTAL_TRANSACTIONS + 1):
            tx_id = f"tx_{i}"
            mch_id = f"mch_{random.randint(1, MERCHANT_COUNT)}"
            
            # Determine fraud pattern type
            roll = random.random()
            
            if roll < 0.88:
                # 1. NORMAL TRANSACTION (88%)
                is_fraud = False
                fraud_type = "NORMAL"
                cust_id = f"cust_{random.randint(1, CUSTOMER_COUNT)}"
                
                # NOISE: Legitimate users sharing devices (e.g., family)
                if random.random() < 0.05:
                    dev_id = f"dev_{random.randint(20, 50)}" # shared among normal users
                else:
                    dev_id = f"dev_{random.randint(1, DEVICE_COUNT)}"
                
                # NOISE: Legitimate users sharing IPs (e.g., corporate/dorm)
                if random.random() < 0.10:
                    ip_id = f"ip_{random.randint(20, 100)}"
                else:
                    ip_id = f"ip_{random.randint(1, IP_COUNT)}"
                    
                pm_id = f"pm_{random.randint(1, PAYMENT_METHOD_COUNT)}"
                coupon_id = f"cpn_{random.randint(1, COUPON_COUNT)}" if random.random() < 0.1 else None
                
                # NOISE: Legitimate transactions with high amounts
                if random.random() < 0.03:
                    amount = round(random.uniform(1000.00, 3000.00), 2)
                else:
                    amount = round(random.uniform(8.50, 450.00), 2)
                    
                status = "APPROVED" if random.random() < 0.97 else "DECLINED"
                
                # NOISE: Normal users with failed attempts
                if random.random() < 0.04:
                    failed_attempts_recent = random.randint(1, 4)
                else:
                    failed_attempts_recent = 0
                    
                payment_attempt_number = failed_attempts_recent + 1
                account_age_minutes = random.randint(1440, 100000)
                country = "USA"

            elif roll < 0.90:
                # 2. CARD TESTING (2%)
                is_fraud = True
                fraud_type = "CARD_TESTING"
                cust_id = f"cust_{random.randint(1, 500)}"
                dev_id = random.choice(card_testing_devices)
                ip_id = random.choice(card_testing_ips)
                pm_id = f"pm_{random.randint(1, PAYMENT_METHOD_COUNT)}"  # rapid switching payment methods
                coupon_id = None
                amount = round(random.uniform(0.50, 3.50), 2)  # small test amount
                status = "DECLINED" if random.random() < 0.70 else "APPROVED"
                payment_attempt_number = random.randint(3, 12)
                failed_attempts_recent = random.randint(3, 9)
                account_age_minutes = random.randint(5, 120)
                country = "USA"

            elif roll < 0.918:
                # 3. ACCOUNT CREATION FARM (1.8%)
                is_fraud = True
                fraud_type = "ACCOUNT_FARM"
                cust_id = f"cust_{random.randint(1000, 3000)}"
                dev_id = random.choice(farm_devices)
                ip_id = random.choice(farm_ips)
                pm_id = f"pm_{random.randint(1, PAYMENT_METHOD_COUNT)}"
                coupon_id = f"cpn_{random.randint(1, 10)}"  # claiming welcome promos
                amount = round(random.uniform(12.00, 35.00), 2)
                status = "APPROVED"
                payment_attempt_number = 1
                failed_attempts_recent = 0
                account_age_minutes = random.randint(1, 14)  # fresh account creation
                country = "USA"

            elif roll < 0.935:
                # 4. ACCOUNT TAKEOVER (1.7%)
                is_fraud = True
                fraud_type = "ACCOUNT_TAKEOVER"
                cust_id = f"cust_{random.randint(5000, 10000)}"  # old account
                dev_id = f"dev_{random.randint(4000, 5000)}"     # brand new device
                ip_id = f"ip_{random.randint(3500, 4000)}"       # foreign proxy IP
                pm_id = f"pm_{random.randint(1, PAYMENT_METHOD_COUNT)}"
                coupon_id = None
                amount = round(random.uniform(250.00, 950.00), 2)
                status = "APPROVED" if random.random() < 0.60 else "DECLINED"
                payment_attempt_number = random.randint(1, 4)
                failed_attempts_recent = random.randint(2, 5)
                account_age_minutes = random.randint(20000, 80000)
                country = random.choice(["NGA", "ROU", "RUS"])

            elif roll < 0.955:
                # 5. COORDINATED FRAUD RING (2.0%)
                is_fraud = True
                fraud_type = "FRAUD_RING"
                cust_id = random.choice(ring_customers)
                dev_id = random.choice(ring_devices)
                ip_id = random.choice(ring_ips)
                pm_id = random.choice(ring_pms)
                coupon_id = None
                amount = round(random.uniform(600.00, 2400.00), 2)
                status = "APPROVED" if random.random() < 0.80 else "DECLINED"
                payment_attempt_number = random.randint(1, 2)
                failed_attempts_recent = random.randint(0, 2)
                account_age_minutes = random.randint(300, 5000)
                country = "USA"

            elif roll < 0.970:
                # 6. COUPON ABUSE (1.5%)
                is_fraud = True
                fraud_type = "COUPON_ABUSE"
                cust_id = f"cust_{random.randint(15000, 20000)}"
                dev_id = f"dev_{random.randint(100, 120)}"
                ip_id = f"ip_{random.randint(100, 120)}"
                pm_id = f"pm_{random.randint(1, PAYMENT_METHOD_COUNT)}"
                coupon_id = coupon_abuse_cpn
                amount = round(random.uniform(5.00, 18.00), 2)
                status = "APPROVED"
                payment_attempt_number = 1
                failed_attempts_recent = 0
                account_age_minutes = random.randint(2, 30)
                country = "USA"

            else:
                # 7. STEALTH RING (3.0%) - Evades XGBoost features completely
                is_fraud = True
                fraud_type = "STEALTH_RING"
                cust_id = f"cust_{random.randint(5000, 18000)}"
                # Highly shared device/IP among distinct accounts, but low frequency over time
                dev_id = random.choice(["dev_991", "dev_992", "dev_993", "dev_994"])
                ip_id = random.choice(["ip_991", "ip_992", "ip_993", "ip_994"])
                pm_id = f"pm_{random.randint(1, PAYMENT_METHOD_COUNT)}"
                coupon_id = None
                amount = round(random.uniform(35.00, 180.00), 2)  # Completely normal amount
                status = "APPROVED"
                payment_attempt_number = 1
                failed_attempts_recent = 0
                account_age_minutes = random.randint(5000, 80000)  # Established accounts
                country = "USA"

            # Time distribution across last 14 days
            tx_time = base_time + timedelta(seconds=int(i * (14 * 86400 / TOTAL_TRANSACTIONS)))

            tx_objs.append(Transaction(
                id=tx_id,
                merchant_id=mch_id,
                customer_id=cust_id,
                device_id=dev_id,
                ip_id=ip_id,
                payment_method_id=pm_id,
                coupon_id=coupon_id,
                amount=amount,
                currency="USD",
                timestamp=tx_time,
                status=status,
                payment_attempt_number=payment_attempt_number,
                failed_attempts_recent=failed_attempts_recent,
                account_age_minutes=account_age_minutes,
                country=country,
                is_fraud=is_fraud,
                fraud_type=fraud_type
            ))

            if len(tx_objs) >= BATCH_SIZE:
                db.bulk_save_objects(tx_objs)
                db.commit()
                tx_objs.clear()
                print(f"Saved {i}/{TOTAL_TRANSACTIONS} transactions...")

        if tx_objs:
            db.bulk_save_objects(tx_objs)
            db.commit()

        elapsed = time.time() - start_time
        print(f"SUCCESS: Successfully seeded database with {TOTAL_TRANSACTIONS} transactions in {elapsed:.2f} seconds!")

    except Exception as e:
        db.rollback()
        print(f"ERROR: Failed to seed database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
