import asyncio
import random
import time
import uuid
import logging
from datetime import datetime
from typing import Dict, Any
from app.core.websockets import ws_manager
from app.models.domain import Transaction, Customer, Device, IPAddress, PaymentMethod, Merchant
from app.core.database import SessionLocal

logger = logging.getLogger("riskgraph.simulator")

class PaymentSimulatorEngine:
    def __init__(self):
        self.is_running: bool = False
        self.current_scenario: str = "normal"
        self.interval_sec: float = 0.25  # ~4 transactions per second by default
        self._task: asyncio.Task | None = None
        
        # Statistics counters
        self.live_tx_count: int = 0
        self.total_amount: float = 0.0
        self.fraud_count: int = 0
        self.start_time: float | None = None

        # Pre-generated entity ID pools for realistic simulator streams
        self.merchants = [f"mch_{i}" for i in range(1, 101)]
        self.customers = [f"cust_{i}" for i in range(1, 20001)]
        self.devices = [f"dev_{i}" for i in range(1, 5001)]
        self.ips = [f"ip_{i}" for i in range(1, 4001)]
        self.payment_methods = [f"pm_{i}" for i in range(1, 15001)]

    def get_status(self) -> Dict[str, Any]:
        uptime_sec = max(1.0, time.time() - self.start_time) if (self.is_running and self.start_time) else 1.0
        tps = round(self.live_tx_count / uptime_sec, 1) if self.is_running else 0.0
        return {
            "is_running": self.is_running,
            "current_scenario": self.current_scenario,
            "live_tx_count": self.live_tx_count,
            "tps": tps,
            "total_amount": round(self.total_amount, 2),
            "fraud_count": self.fraud_count,
            "interval_sec": self.interval_sec
        }

    def start(self, scenario: str = "normal", interval_sec: float = 0.25):
        if self.is_running:
            self.current_scenario = scenario
            self.interval_sec = interval_sec
            return
        self.is_running = True
        self.current_scenario = scenario
        self.interval_sec = interval_sec
        self.start_time = time.time()
        
        try:
            loop = asyncio.get_running_loop()
            self._task = loop.create_task(self._simulation_loop())
        except RuntimeError:
            self._task = asyncio.ensure_future(self._simulation_loop())
        
        logger.info(f"Payment Simulator started with scenario '{scenario}'")

    def stop(self):
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
            self._task = None
        logger.info("Payment Simulator stopped")

    def set_scenario(self, scenario: str):
        valid_scenarios = ["normal", "card_testing", "account_farm", "fraud_ring", "account_takeover", "stealth_ring"]
        if scenario in valid_scenarios:
            self.current_scenario = scenario
            logger.info(f"Simulator scenario changed to '{scenario}'")

    async def _simulation_loop(self):
        try:
            while self.is_running:
                event = self._generate_simulated_payment()
                self.live_tx_count += 1
                self.total_amount += event["amount"]
                if event["is_fraud"]:
                    self.fraud_count += 1

                # Persist to database
                try:
                    with SessionLocal() as db:
                        m = db.query(Merchant).filter_by(id=event["merchant_id"]).first()
                        if not m:
                            m = Merchant(id=event["merchant_id"], name=f"Merchant {event['merchant_id']}", category="retail")
                            db.add(m)
                            
                        c = db.query(Customer).filter_by(id=event["customer_id"]).first()
                        if not c:
                            c = Customer(id=event["customer_id"], email_domain="example.com")
                            db.add(c)
                            
                        d = db.query(Device).filter_by(id=event["device_id"]).first()
                        if not d:
                            d = Device(id=event["device_id"], fingerprint_hash="hash", device_type="desktop", os_name="windows")
                            db.add(d)
                            
                        ip = db.query(IPAddress).filter_by(id=event["ip_id"]).first()
                        if not ip:
                            ip = IPAddress(id=event["ip_id"], ip_address="127.0.0.1", country_code=event["country"])
                            db.add(ip)
                            
                        pm = db.query(PaymentMethod).filter_by(id=event["payment_method_id"]).first()
                        if not pm:
                            pm = PaymentMethod(id=event["payment_method_id"], card_hash="hash", card_bin="123456")
                            db.add(pm)
                            
                        tx = Transaction(
                            id=event["id"],
                            merchant_id=event["merchant_id"],
                            customer_id=event["customer_id"],
                            device_id=event["device_id"],
                            ip_id=event["ip_id"],
                            payment_method_id=event["payment_method_id"],
                            amount=event["amount"],
                            currency=event["currency"],
                            timestamp=datetime.fromisoformat(event["timestamp"]),
                            status=event["status"],
                            payment_attempt_number=event["payment_attempt_number"],
                            failed_attempts_recent=event["failed_attempts_recent"],
                            account_age_minutes=event["account_age_minutes"],
                            country=event["country"],
                            is_fraud=event["is_fraud"],
                            fraud_type=event["fraud_type"]
                        )
                        db.add(tx)
                        db.commit()
                except Exception as e:
                    logger.error(f"Error persisting transaction to DB: {e}")

                # Broadcast live payment event and stats over WebSocket
                payload = {
                    "event": "payment_event",
                    "data": event,
                    "stats": self.get_status()
                }
                await ws_manager.broadcast(payload)
                await asyncio.sleep(self.interval_sec)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in simulator loop: {e}")
            self.is_running = False

    def _generate_simulated_payment(self) -> Dict[str, Any]:
        scenario = self.current_scenario
        tx_id = f"tx_sim_{uuid.uuid4().hex[:8]}"
        timestamp = datetime.utcnow().isoformat()

        if scenario == "card_testing":
            # Card testing rapid micro payments
            is_fraud = True
            fraud_type = "CARD_TESTING"
            merchant_id = "mch_1"
            customer_id = "cust_12"
            device_id = "dev_9"
            ip_id = "ip_9"
            payment_method_id = f"pm_{random.randint(100, 15000)}"  # rapidly changing cards
            amount = round(random.uniform(0.75, 2.50), 2)
            status = "DECLINED" if random.random() < 0.8 else "APPROVED"
            payment_attempt_number = random.randint(4, 12)
            failed_attempts_recent = random.randint(3, 10)
            account_age_minutes = 45
            country = "USA"

        elif scenario == "account_farm":
            # Account creation farm
            is_fraud = True
            fraud_type = "ACCOUNT_FARM"
            merchant_id = random.choice(["mch_3", "mch_5", "mch_8"])
            customer_id = f"cust_{random.randint(18000, 20000)}"
            device_id = "dev_33"
            ip_id = "ip_33"
            payment_method_id = f"pm_{random.randint(1, 1000)}"
            amount = round(random.uniform(15.00, 39.00), 2)
            status = "APPROVED"
            payment_attempt_number = 1
            failed_attempts_recent = 0
            account_age_minutes = random.randint(1, 10)
            country = "USA"

        elif scenario == "fraud_ring":
            # Coordinated high value graph ring
            is_fraud = True
            fraud_type = "FRAUD_RING"
            merchant_id = random.choice(self.merchants[:10])
            customer_id = random.choice([f"cust_{i}" for i in range(100, 120)])
            device_id = random.choice([f"dev_{i}" for i in range(50, 60)])
            ip_id = random.choice([f"ip_{i}" for i in range(50, 60)])
            payment_method_id = random.choice([f"pm_{i}" for i in range(100, 150)])
            amount = round(random.uniform(750.00, 2200.00), 2)
            status = "APPROVED" if random.random() < 0.75 else "DECLINED"
            payment_attempt_number = 1
            failed_attempts_recent = 1
            account_age_minutes = random.randint(500, 3000)
            country = "USA"

        elif scenario == "account_takeover":
            # ATO from foreign proxy IP
            is_fraud = True
            fraud_type = "ACCOUNT_TAKEOVER"
            merchant_id = random.choice(self.merchants)
            customer_id = f"cust_{random.randint(5000, 8000)}"
            device_id = f"dev_{random.randint(4500, 5000)}"
            ip_id = f"ip_{random.randint(3800, 4000)}"
            payment_method_id = f"pm_{random.randint(1, 15000)}"
            amount = round(random.uniform(350.00, 890.00), 2)
            status = "APPROVED" if random.random() < 0.6 else "DECLINED"
            payment_attempt_number = random.randint(1, 3)
            failed_attempts_recent = random.randint(2, 4)
            account_age_minutes = random.randint(30000, 90000)
            country = random.choice(["NGA", "ROU"])

        elif scenario == "stealth_ring":
            # Stealth Fraud Ring evading transaction features
            is_fraud = True
            fraud_type = "STEALTH_RING"
            merchant_id = random.choice(self.merchants)
            customer_id = f"cust_{random.randint(5000, 18000)}"
            device_id = random.choice(["dev_991", "dev_992", "dev_993", "dev_994"])
            ip_id = random.choice(["ip_991", "ip_992", "ip_993", "ip_994"])
            payment_method_id = f"pm_{random.randint(1, 15000)}"
            amount = round(random.uniform(45.00, 160.00), 2)
            status = "APPROVED"
            payment_attempt_number = 1
            failed_attempts_recent = 0
            account_age_minutes = random.randint(10000, 70000)
            country = "USA"

        else: # "normal"
            is_fraud = random.random() < 0.03
            fraud_type = "CARD_TESTING" if is_fraud else "NORMAL"
            merchant_id = random.choice(self.merchants)
            customer_id = random.choice(self.customers)
            device_id = random.choice(self.devices)
            ip_id = random.choice(self.ips)
            payment_method_id = random.choice(self.payment_methods)
            amount = round(random.uniform(12.00, 320.00), 2)
            status = "APPROVED" if random.random() < 0.96 else "DECLINED"
            payment_attempt_number = 1
            failed_attempts_recent = 0
            account_age_minutes = random.randint(1440, 50000)
            country = "USA"

        return {
            "id": tx_id,
            "merchant_id": merchant_id,
            "customer_id": customer_id,
            "device_id": device_id,
            "ip_id": ip_id,
            "payment_method_id": payment_method_id,
            "amount": amount,
            "currency": "USD",
            "timestamp": timestamp,
            "status": status,
            "payment_attempt_number": payment_attempt_number,
            "failed_attempts_recent": failed_attempts_recent,
            "account_age_minutes": account_age_minutes,
            "country": country,
            "is_fraud": is_fraud,
            "fraud_type": fraud_type
        }

simulator_engine = PaymentSimulatorEngine()
