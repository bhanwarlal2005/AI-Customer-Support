from getpass import getpass

from sqlalchemy.exc import IntegrityError

import models
from auth import hash_password
from database import Base, SessionLocal, engine


def main():
    Base.metadata.create_all(bind=engine)

    username = input("Admin username [admin]: ").strip() or "admin"
    email = input("Admin email: ").strip()
    password = getpass("Admin password: ")
    password_confirmation = getpass("Confirm admin password: ")

    if password != password_confirmation:
        raise SystemExit("Passwords do not match.")

    try:
        hashed_password = hash_password(password)
    except ValueError as error:
        raise SystemExit(str(error)) from error

    with SessionLocal() as db:
        if db.query(models.User).filter(models.User.role == "Admin").first():
            raise SystemExit("An Admin account already exists; no account was created.")

        admin = models.User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            role="Admin",
        )
        db.add(admin)

        try:
            db.commit()
        except IntegrityError as error:
            db.rollback()
            raise SystemExit("That username or email is already registered.") from error

    print(f"Admin account '{username}' created.")


if __name__ == "__main__":
    main()
