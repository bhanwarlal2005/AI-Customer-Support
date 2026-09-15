from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(
        text(
            "ALTER TABLE tickets "
            "ADD COLUMN assigned_team TEXT DEFAULT 'General Support'"
        )
    )
    conn.commit()

print("assigned_team column added successfully!")