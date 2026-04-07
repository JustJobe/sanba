import logging
from sqlalchemy.orm import Session
from ..models.credit_ledger import CreditLedger

logger = logging.getLogger(__name__)


def record_credit_change(
    db: Session,
    user_id: str,
    action: str,
    amount: int,
    balance_after: int,
    actor: str,
    job_id: str = None,
    payment_id: str = None,
    note: str = None,
):
    """Append one row to the credit_ledger table.

    Call AFTER modifying user.credits but BEFORE db.commit().
    The ledger write shares the caller's transaction.
    """
    entry = CreditLedger(
        user_id=user_id,
        action=action,
        amount=amount,
        balance_after=balance_after,
        actor=actor,
        job_id=job_id,
        payment_id=payment_id,
        note=note,
    )
    db.add(entry)
    logger.info(
        f"Ledger: user={user_id} action={action} amount={amount:+d} "
        f"balance_after={balance_after} actor={actor}"
    )
