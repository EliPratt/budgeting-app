from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User

COOKIE_NAME = "access_token"


def get_current_user(
    access_token: str | None = Cookie(default=None, alias=COOKIE_NAME),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
    )
    if access_token is None:
        raise unauthorized
    user_id = decode_access_token(access_token)
    if user_id is None:
        raise unauthorized
    user = db.get(User, int(user_id))
    if user is None:
        raise unauthorized
    return user
