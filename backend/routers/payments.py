import os
import logging
import datetime
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.payment import Payment
from ..models.user import User
from ..models.activity_log import ActivityLog
from .auth import get_current_user
from ..services.credit_ledger import record_credit_change

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

CREDIT_PACKAGES = {
    "50_credits": {
        "credits": 50,
        "price_myr_cents": 990,
        "label": "50 Credits",
        "per_credit_label": "RM 0.20 / credit",
    },
    "200_credits": {
        "credits": 200,
        "price_myr_cents": 2990,
        "label": "200 Credits",
        "per_credit_label": "RM 0.15 / credit",
        "badge": "POPULAR",
    },
}


class CheckoutRequest(BaseModel):
    package_key: str


@router.get("/packages")
def get_packages():
    return CREDIT_PACKAGES


@router.post("/checkout")
def create_checkout_session(
    body: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    package = CREDIT_PACKAGES.get(body.package_key)
    if not package:
        raise HTTPException(status_code=400, detail="Invalid package")

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

    session = stripe.checkout.Session.create(
        mode="payment",
        currency="myr",
        line_items=[{
            "price_data": {
                "currency": "myr",
                "unit_amount": package["price_myr_cents"],
                "product_data": {
                    "name": package["label"],
                    "description": f'{package["credits"]} restoration credits for SanBa',
                },
            },
            "quantity": 1,
        }],
        payment_method_types=["card", "fpx", "grabpay"],
        client_reference_id=current_user.id,
        metadata={
            "package_key": body.package_key,
            "credits_amount": str(package["credits"]),
            "user_id": current_user.id,
        },
        success_url=f"{frontend_url}/store/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{frontend_url}/store",
    )

    payment = Payment(
        user_id=current_user.id,
        stripe_checkout_session_id=session.id,
        package_key=body.package_key,
        credits_amount=package["credits"],
        price_myr_cents=package["price_myr_cents"],
        status="pending",
    )
    db.add(payment)
    db.commit()

    return {"checkout_url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except Exception as e:
        if "SignatureVerification" in type(e).__name__:
            raise HTTPException(status_code=400, detail="Invalid signature")
        raise

    # Convert Stripe objects to plain dicts for safe attribute access
    event_dict = event.to_dict() if hasattr(event, "to_dict") else dict(event)

    if event_dict["type"] == "checkout.session.completed":
        session_data = event_dict["data"]["object"]
        session_id = session_data["id"]

        payment = db.query(Payment).filter(
            Payment.stripe_checkout_session_id == session_id
        ).first()

        if not payment:
            logger.warning(f"Webhook: no payment found for session {session_id}")
            return {"status": "ok"}

        if payment.status == "completed":
            logger.info(f"Webhook: payment {payment.id} already completed, skipping")
            return {"status": "ok"}

        # Credit the user
        user = db.query(User).filter(User.id == payment.user_id).first()
        if not user:
            logger.error(f"Webhook: user {payment.user_id} not found for payment {payment.id}")
            return {"status": "ok"}

        user.credits += payment.credits_amount
        payment.status = "completed"
        payment.credits_delivered = payment.credits_amount
        payment.completed_at = datetime.datetime.utcnow()
        payment.stripe_payment_intent_id = session_data.get("payment_intent")
        payment.stripe_event_data = event_dict

        record_credit_change(
            db=db, user_id=user.id, action="purchase",
            amount=+payment.credits_amount, balance_after=user.credits,
            actor="system", payment_id=payment.id,
            note=f"package={payment.package_key}",
        )

        db.add(ActivityLog(
            user_id=user.id,
            action="purchase_credits",
            details={
                "package_key": payment.package_key,
                "credits": payment.credits_amount,
                "price_myr_cents": payment.price_myr_cents,
                "stripe_session_id": session_id,
            },
        ))
        db.commit()
        logger.info(f"Payment {payment.id}: credited {payment.credits_amount} to user {user.email}")

    elif event_dict["type"] == "checkout.session.expired":
        session_data = event_dict["data"]["object"]
        session_id = session_data["id"]

        payment = db.query(Payment).filter(
            Payment.stripe_checkout_session_id == session_id
        ).first()

        if payment and payment.status == "pending":
            payment.status = "expired"
            db.commit()
            logger.info(f"Payment {payment.id}: marked expired")

    return {"status": "ok"}


@router.get("/history")
def get_payment_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payments = (
        db.query(Payment)
        .filter(Payment.user_id == current_user.id)
        .order_by(Payment.created_at.desc())
        .all()
    )
    return [
        {
            "id": p.id,
            "package_key": p.package_key,
            "credits_amount": p.credits_amount,
            "price_myr_cents": p.price_myr_cents,
            "status": p.status,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
        }
        for p in payments
    ]
