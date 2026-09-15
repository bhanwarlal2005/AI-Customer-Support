from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(
        text(
            "ALTER TABLE tickets "
            "ADD COLUMN reply_status TEXT DEFAULT 'Not Sent'"
        )
    )
    conn.commit()

print("reply_status column added successfully!")