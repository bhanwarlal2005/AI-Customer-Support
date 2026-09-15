from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime

from database import Base


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)

    customer_name = Column(String(100), nullable=False)

    customer_email = Column(String(150), nullable=False)

    subject = Column(String(200), nullable=False)

    description = Column(Text, nullable=False)

    category = Column(String(50), default="General")

    priority = Column(String(20), default="Medium")

    status = Column(String(20), default="Open")

    sentiment = Column(String(30), default="Neutral")
    assigned_team = Column(String(50), default="General Support")
    assigned_agent = Column(String(100), default="")
    escalated = Column(String(10), default="No")
    reply_status = Column(String(20), default="Not Sent")
    suggested_reply = Column(Text, default="")

    created_at = Column(DateTime, default=datetime.utcnow)


class TicketActivity(Base):
    __tablename__ = "ticket_activities"

    id = Column(Integer, primary_key=True, index=True)

    ticket_id = Column(Integer, nullable=False, index=True)

    action = Column(String, nullable=False)

    description = Column(String, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(String(100), unique=True, nullable=False, index=True)

    email = Column(String(150), unique=True, nullable=False, index=True)

    hashed_password = Column(String(255), nullable=False)

    role = Column(String(30), default="Support Agent")

    created_at = Column(DateTime, default=datetime.utcnow)
