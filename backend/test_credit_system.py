import sys
import os
import datetime

# Add root to sys.path to allow imports
sys.path.append(os.path.abspath("/root/sanba"))

from backend.database import SessionLocal, engine, Base
from backend.models.user import User
from backend.models.incentive import IncentivePlan
from backend.models.system_setting import SystemSetting
from backend.routers.auth import replenish_credits, get_new_user_credits

def test_credit_replenishment():
    db = SessionLocal()
    
    # Setup: Create a test incentive plan
    # Clean up old test data
    db.query(IncentivePlan).filter(IncentivePlan.name == "Test Daily").delete()
    db.query(User).filter(User.email == "test_credit@example.com").delete()
    db.commit()

    plan = IncentivePlan(
        name="Test Daily",
        reward_amount=1,
        cooldown_hours=24, # Should trigger daily logic
        max_balance_cap=3,
        requires_profile_complete=False,
        is_active=True
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    print(f"Created Plan: {plan.name}, Cooldown: {plan.cooldown_hours}, Cap: {plan.max_balance_cap}")

    # Setup: Create User
    user = User(email="test_credit@example.com", credits=1, full_name="Tester")
    # Set last replenishment to yesterday
    yesterday = datetime.datetime.utcnow() - datetime.timedelta(days=1, hours=1)
    user.last_credit_replenishment = yesterday
    
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"Created User: Credits={user.credits}, Last Replenish={user.last_credit_replenishment}")

    # Test 1: Should replenish
    print("\n--- Test 1: Should Replenish ---")
    replenish_credits(user, db)
    print(f"User Credits after replenish: {user.credits} (Expected: 2)")
    print(f"Last Replenish: {user.last_credit_replenishment}")
    
    if user.credits != 2:
        print("FAIL: Credits did not increase")
    else:
        print("PASS")

    # Test 2: Should NOT replenish immediately after
    print("\n--- Test 2: Should NOT Replenish Same Day ---")
    replenish_credits(user, db)
    print(f"User Credits: {user.credits} (Expected: 2)")
    
    if user.credits != 2:
         print("FAIL: Credits increased incorrectly")
    else:
         print("PASS")

    # Test 3: Max Cap
    print("\n--- Test 3: Max Cap ---")
    user.credits = 3
    # Reset date to yesterday to force eligibility
    user.last_credit_replenishment = yesterday
    db.commit()
    
    replenish_credits(user, db)
    print(f"User Credits: {user.credits} (Expected: 3)")
    
    if user.credits != 3:
         print("FAIL: Credits exceeded cap")
    else:
         print("PASS")

    # Test 4: System Setting
    print("\n--- Test 4: New User Credits Setting ---")
    # Set setting
    setting = db.query(SystemSetting).filter(SystemSetting.key == "new_user_credits").first()
    if not setting:
        setting = SystemSetting(key="new_user_credits", value="10")
        db.add(setting)
    
    setting.value = "50"
    db.commit()
    
    credits = get_new_user_credits(db)
    print(f"New User Credits Fetched: {credits} (Expected: 50)")
    
    if credits != 50:
        print("FAIL: System setting not working")
    else:
        print("PASS")

    db.close()

if __name__ == "__main__":
    test_credit_replenishment()
