"""Create (or update the password for) the single owner user.

Usage: OWNER_EMAIL=... OWNER_PASSWORD=... python -m scripts.seed_owner
"""

import os
import sys

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User


def main() -> None:
    email = os.environ.get("OWNER_EMAIL")
    password = os.environ.get("OWNER_PASSWORD")
    if not email or not password:
        print("Set OWNER_EMAIL and OWNER_PASSWORD environment variables.", file=sys.stderr)
        raise SystemExit(1)

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            user = User(email=email, hashed_password=hash_password(password))
            db.add(user)
            print(f"Created owner user {email}")
        else:
            user.hashed_password = hash_password(password)
            print(f"Updated password for {email}")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
