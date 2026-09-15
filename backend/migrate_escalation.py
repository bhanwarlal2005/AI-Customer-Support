from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(
        text(
            "ALTER TABLE tickets "
            "ADD COLUMN escalated TEXT DEFAULT 'No'"
        )
    )
    conn.commit()

print("escalated column added successfully!")