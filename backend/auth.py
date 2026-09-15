from datetime import datetime, timedelta

import os
import bcrypt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is not configured")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


security = HTTPBearer()


def hash_password(password: str):
    password_bytes = password.encode("utf-8")

    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")

    if len(password_bytes) > 72:
        raise ValueError("Password must be 72 bytes or less")

    salt = bcrypt.gensalt()

    hashed = bcrypt.hashpw(password_bytes, salt)

    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str):
    password_bytes = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")

    return bcrypt.checkpw(password_bytes, hashed_bytes)


def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)



def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        username = payload.get("sub")
        role = payload.get("role")

        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        return {"username": username, "role": role}

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def require_admin(current_user=Depends(get_current_user)):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return current_user
