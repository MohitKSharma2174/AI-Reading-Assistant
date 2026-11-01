import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import SECRET_KEY, ALGORITHM
from models.schema import User
from models.schemas import TokenData

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Decode JWT access token and return authenticated User ORM object."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str | None = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        token_data = TokenData(sub=user_id_str)
    except jwt.PyJWTError:
        raise credentials_exception

    try:
        user_id = int(token_data.sub)
    except (ValueError, TypeError):
        # Fall back if sub is email
        user = db.query(User).filter(User.email == token_data.sub).first()
        if user is None:
            raise credentials_exception
        return user

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    return user


def get_optional_current_user(
    token: str | None = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db)
) -> User | None:
    """Decode JWT access token if present; return None if token is missing or invalid."""
    if not token:
        return None

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str | None = payload.get("sub")
        if not user_id_str:
            return None
        token_data = TokenData(sub=user_id_str)
    except jwt.PyJWTError:
        return None

    try:
        user_id = int(token_data.sub)
    except (ValueError, TypeError):
        return db.query(User).filter(User.email == token_data.sub).first()

    return db.query(User).filter(User.id == user_id).first()

