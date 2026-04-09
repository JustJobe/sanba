from fastapi import APIRouter, Depends, HTTPException, status, Request
from starlette.responses import RedirectResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..models.incentive import IncentivePlan
from ..models.system_setting import SystemSetting
from pydantic import BaseModel, EmailStr
import datetime
from jose import jwt
from typing import Optional
from mailjet_rest import Client
from authlib.integrations.starlette_client import OAuth
import os
import random
from ..services.credit_ledger import record_credit_change
from .jobs import seed_sample_job

router = APIRouter()

# --- CONFIG ---
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
OTP_STORE = {} # Simple in-memory storage for demo: {email: otp}

# Mailjet Config
MAILJET_API_KEY = os.getenv("MAILJET_API_KEY")
MAILJET_API_SECRET = os.getenv("MAILJET_API_SECRET")
MAILJET_SENDER_EMAIL = os.getenv("MAILJET_SENDER_EMAIL", "noreply@sanba.my")

mailjet = Client(auth=(MAILJET_API_KEY, MAILJET_API_SECRET), version='v3.1')

# --- OAUTH CONFIG ---
oauth = OAuth()

# Google
oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

# Facebook
oauth.register(
    name='facebook',
    client_id=os.getenv('FACEBOOK_CLIENT_ID'),
    client_secret=os.getenv('FACEBOOK_CLIENT_SECRET'),
    access_token_url='https://graph.facebook.com/oauth/access_token',
    access_token_params=None,
    authorize_url='https://www.facebook.com/dialog/oauth',
    authorize_params=None,
    api_base_url='https://graph.facebook.com/',
    client_kwargs={'scope': 'email'},
)

# --- SCHEMAS ---
class EmailRequest(BaseModel):
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: str
    email: str
    phone: Optional[str]
    full_name: Optional[str]
    credits: int
    is_admin: int
    credit_replenished: bool = False

class UserUpdate(BaseModel):
    full_name: Optional[str]
    phone: Optional[str]

# --- LOGIC ---

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(days=7) # Long lived for convenience
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_new_user_credits(db: Session) -> int:
    setting = db.query(SystemSetting).filter(SystemSetting.key == "new_user_credits").first()
    if setting and setting.value and setting.value.isdigit():
        return int(setting.value)
    return 10 # Default fallback

def replenish_credits(user: User, db: Session) -> bool:
    """Try to grant daily free credit. Returns True if credit was awarded."""
    now = datetime.datetime.utcnow()

    # Get active incentive plans
    active_plans = db.query(IncentivePlan).filter(IncentivePlan.is_active == True).all()

    # For now, we'll just process the FIRST applicable plan to avoid stacking complexity
    # In future, we might want to stack them or have tiers.

    for plan in active_plans:
        # Check requirements
        if plan.requires_profile_complete:
            if not user.full_name: # Simple check: name required
                continue

        # Check cooldown
        last_replenish = user.last_credit_replenishment or datetime.datetime.min

        # If cooldown is >= 20 hours, treat as "Daily Reset" (resets at UTC+8 midnight)
        if plan.cooldown_hours >= 20:
            tz_utc8 = datetime.timezone(datetime.timedelta(hours=8))
            now_utc8 = datetime.datetime.now(tz_utc8)
            last_utc8 = last_replenish.replace(
                tzinfo=datetime.timezone.utc
            ).astimezone(tz_utc8)
            if last_utc8.date() >= now_utc8.date():
                continue
        else:
            # Standard hourly check
            if (now - last_replenish).total_seconds() / 3600 < plan.cooldown_hours:
                continue

        # Check balance cap
        if user.credits >= plan.max_balance_cap:
            continue

        # Apply Reward
        user.credits += plan.reward_amount
        user.last_credit_replenishment = now
        record_credit_change(
            db=db, user_id=user.id, action="daily_claim",
            amount=+plan.reward_amount, balance_after=user.credits,
            actor="system",
        )
        db.commit()
        db.refresh(user)
        return True  # Credit awarded
    return False  # No plan qualified

@router.post("/request-otp")
def request_otp(request: EmailRequest):
    # Generate random 6-digit OTP
    otp = str(random.randint(100000, 999999))
    OTP_STORE[request.email] = otp
    
    # Send Email via Mailjet
    data = {
      'Messages': [
        {
          "From": {
            "Email": MAILJET_SENDER_EMAIL,
            "Name": "SanBa"
          },
          "To": [
            {
              "Email": request.email,
              "Name": "User"
            }
          ],
          "Subject": "Your Login Code",
          "TextPart": f"Your verification code for SanBa is: {otp}. It is valid for 5 minutes.",
          "HTMLPart": f"<h3>Welcome to SanBa!</h3><br />Your login verification code is: <strong>{otp}</strong>"
        }
      ]
    }
    
    try:
        result = mailjet.send.create(data=data)
        if result.status_code != 200:
            print(f"Mailjet Error: {result.json()}")
            raise HTTPException(status_code=500, detail="Failed to send email")
        print(f"--- OTP SENT TO {request.email} (Check Inbox) ---")
    except Exception as e:
        print(f"Mailjet Exception: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")
        
    return {"message": "OTP sent"}

@router.post("/verify-otp", response_model=Token)
def verify_otp(request: VerifyOTPRequest, db: Session = Depends(get_db)):
    stored_otp = OTP_STORE.get(request.email)
    if not stored_otp or stored_otp != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Clear OTP
    OTP_STORE.pop(request.email, None)
    
    # Get or create user
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        initial_credits = get_new_user_credits(db)
        user = User(email=request.email, credits=initial_credits)
        db.add(user)
        db.flush()
        record_credit_change(
            db=db, user_id=user.id, action="signup_bonus",
            amount=+initial_credits, balance_after=user.credits,
            actor="system",
        )
        db.commit()
        db.refresh(user)
        # Seed a sample job so the dashboard isn't empty on first visit
        seed_sample_job(db, user.id)
    # Replenishment is handled by GET /auth/me which the frontend calls immediately after login

    access_token = create_access_token(data={"sub": user.email, "user_id": user.id})
    return {"access_token": access_token, "token_type": "bearer"}

from fastapi import Header

def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != 'bearer':
             raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
            
        return user
    except Exception as e:
        raise HTTPException(status_code=401, detail="Could not validate credentials") # from e

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    replenished = replenish_credits(current_user, db)
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        phone=current_user.phone,
        full_name=current_user.full_name,
        credits=current_user.credits,
        is_admin=current_user.is_admin,
        credit_replenished=replenished,
    )

@router.put("/me", response_model=UserResponse)
def update_user_me(user_update: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.phone is not None:
        current_user.phone = user_update.phone
    
    db.commit()
    db.refresh(current_user)
    
    
    # Try replenishing credits after profile update (in case they just qualified)
    replenish_credits(current_user, db)
    
    return current_user

# --- OAUTH ENDPOINTS ---

@router.get('/login/{provider}')
async def login_via_provider(provider: str, request: Request):
    # Construct redirect URI
    # Use API_BASE_URL from env or fallback to localhost for dev
    # Use API_BASE_URL from env or fallback to localhost for dev
    api_base = os.getenv('API_BASE_URL', 'http://localhost:8002/api/v1')
    redirect_uri = f"{api_base}/auth/callback/{provider}"
    return await oauth.create_client(provider).authorize_redirect(request, redirect_uri)

@router.get('/callback/{provider}')
async def auth_callback(provider: str, request: Request, db: Session = Depends(get_db)):
    client = oauth.create_client(provider)
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    
    try:
        token = await client.authorize_access_token(request)
    except Exception as e:
        print(f"OAuth Error: {e}")
        # Redirect to frontend with error
        return RedirectResponse(url=f"{frontend_url}/login?error=oauth_failed")

    user_email = None
    user_name = None

    if provider == 'google':
        user_info = token.get('userinfo')
        if user_info:
            user_email = user_info.get('email')
            user_name = user_info.get('name')
    elif provider == 'facebook':
        # Facebook requires a separate call to get profile
        resp = await client.get('me?fields=id,name,email', token=token)
        profile = resp.json()
        user_email = profile.get('email')
        user_name = profile.get('name')

    if not user_email:
        # Fallback or error if email not provided (some FB accounts might not share it)
        return RedirectResponse(url=f"{frontend_url}/login?error=email_missing")

    # Get or Create User
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        initial_credits = get_new_user_credits(db)
        user = User(
            email=user_email, 
            full_name=user_name,
            credits=initial_credits
        )
        db.add(user)
        db.flush()
        record_credit_change(
            db=db, user_id=user.id, action="signup_bonus",
            amount=+initial_credits, balance_after=user.credits,
            actor="system",
        )
        db.commit()
        db.refresh(user)
        seed_sample_job(db, user.id)
    else:
        # Update name if missing
        if not user.full_name and user_name:
            user.full_name = user_name
            db.commit()
        # Replenish check
        replenish_credits(user, db)

    # Generate internal JWT
    access_token = create_access_token(data={"sub": user.email, "user_id": user.id})
    
    # Redirect to Frontend with Token
    return RedirectResponse(url=f"{frontend_url}/auth/callback?token={access_token}")
