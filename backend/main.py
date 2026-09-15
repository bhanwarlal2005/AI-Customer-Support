from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import models

from database import engine, get_db
from models import Ticket, TicketActivity

from ai_engine import analyze_ticket
from email_service import send_customer_email

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_admin,
)
from schemas import (
    TicketCreate,
    TicketResponse,
    UserRegister,
    UserLogin,
    TokenResponse,
)

models.Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="AI Customer Support System",
    description="AI-powered customer support and ticketing system",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.137.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/")
def home():
    return {"message": "AI Customer Support API is running", "status": "success"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/tickets", response_model=TicketResponse)
def create_ticket(
    ticket: TicketCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):

    # Analyze ticket
    category, priority, sentiment, suggested_reply, assigned_team = analyze_ticket(
        ticket.subject, ticket.description
    )

    # Escalation logic
    if priority == "High" and sentiment == "Negative":
        escalated = "Yes"
    else:
        escalated = "No"

    # Create ticket
    new_ticket = models.Ticket(
        customer_name=ticket.customer_name,
        customer_email=ticket.customer_email,
        subject=ticket.subject,
        description=ticket.description,
        category=category,
        priority=priority,
        sentiment=sentiment,
        suggested_reply=suggested_reply,
        assigned_team=assigned_team,
        escalated=escalated,
        reply_status="Not Sent",
    )

    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    # Create activity
    activity = TicketActivity(
        ticket_id=new_ticket.id,
        action="Ticket Created",
        description=f"Ticket #{new_ticket.id} was created by {new_ticket.customer_name}",
    )

    db.add(activity)
    db.commit()

    return new_ticket


@app.get("/tickets")
def get_tickets(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(models.Ticket)

    # Support Agent → only assigned tickets
    if current_user["role"] == "Support Agent":
        query = query.filter(models.Ticket.assigned_agent == current_user["username"])

    return query.order_by(models.Ticket.created_at.desc()).all()


@app.get("/agent/my-tickets")
def get_my_assigned_tickets(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user["role"] != "Support Agent":
        raise HTTPException(
            status_code=403,
            detail="Support Agent access required",
        )

    tickets = (
        db.query(models.Ticket)
        .filter(models.Ticket.assigned_agent == current_user["username"])
        .order_by(models.Ticket.created_at.desc())
        .all()
    )

    return tickets


@app.put("/tickets/{ticket_id}/assign-agent")
def assign_ticket_agent(
    ticket_id: int,
    agent_username: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    # Check ticket
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found",
        )

    # Check Support Agent
    agent = (
        db.query(models.User)
        .filter(
            models.User.username == agent_username,
            models.User.role == "Support Agent",
        )
        .first()
    )

    if not agent:
        raise HTTPException(
            status_code=404,
            detail="Support Agent not found",
        )

    old_agent = ticket.assigned_agent or ""

    # Assign agent
    ticket.assigned_agent = agent.username

    db.commit()
    db.refresh(ticket)

    # Activity Timeline
    if old_agent != agent.username:
        activity = models.TicketActivity(
            ticket_id=ticket.id,
            action="Agent Assigned",
            description=f"Ticket assigned to {agent.username}",
        )

        db.add(activity)
        db.commit()

    return {
        "message": "Ticket assigned successfully",
        "ticket_id": ticket.id,
        "assigned_agent": ticket.assigned_agent,
    }


@app.get("/tickets/{ticket_id}", response_model=TicketResponse)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found",
        )

    # Support Agent can access only their assigned tickets
    if current_user["role"] == "Support Agent":
        if ticket.assigned_agent != current_user["username"]:
            raise HTTPException(
                status_code=403,
                detail="You can access only your assigned tickets.",
            )

    return ticket


@app.put("/tickets/{ticket_id}/priority", response_model=TicketResponse)
def update_ticket_priority(
    ticket_id: int,
    priority: str,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    allowed_priorities = ["Low", "Medium", "High", "Urgent"]

    if priority not in allowed_priorities:
        raise HTTPException(
            status_code=400,
            detail="Invalid priority. Use Low, Medium, High, or Urgent.",
        )

    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Support Agent can update only their assigned tickets
    if current_user["role"] == "Support Agent":
        if ticket.assigned_agent != current_user["username"]:
            raise HTTPException(
                status_code=403,
                detail="You can update only your assigned tickets.",
            )

    old_priority = ticket.priority

    # Update only if priority actually changed
    if old_priority != priority:
        ticket.priority = priority

        db.commit()
        db.refresh(ticket)

        activity = TicketActivity(
            ticket_id=ticket.id,
            action="Priority Changed",
            description=f"Priority changed from {old_priority} to {priority}",
        )

        db.add(activity)
        db.commit()
    else:
        db.refresh(ticket)

    return ticket


@app.put("/tickets/{ticket_id}/status", response_model=TicketResponse)
def update_ticket_status(
    ticket_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found",
        )

    # Support Agent can update only their assigned tickets
    if current_user["role"] == "Support Agent":
        if ticket.assigned_agent != current_user["username"]:
            raise HTTPException(
                status_code=403,
                detail="You can update only your assigned tickets.",
            )

    allowed_statuses = ["Open", "In Progress", "Resolved"]

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid status. Use: Open, In Progress, or Resolved",
        )

    old_status = ticket.status

    if old_status != status:
        ticket.status = status

        db.commit()
        db.refresh(ticket)

        activity = TicketActivity(
            ticket_id=ticket.id,
            action="Status Changed",
            description=f"Status changed from {old_status} to {status}",
        )

        db.add(activity)
        db.commit()
    else:
        db.refresh(ticket)

    return ticket


@app.put("/tickets/{ticket_id}/team", response_model=TicketResponse)
def update_ticket_team(
    ticket_id: int,
    team: str,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    allowed_teams = [
        "Customer Support",
        "Technical Support",
        "Finance Team",
        "Order Management",
        "Sales Team",
        "General Support",
    ]

    if team not in allowed_teams:
        raise HTTPException(status_code=400, detail="Invalid team.")

    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Support Agent can update only their assigned tickets
    if current_user["role"] == "Support Agent":
        if ticket.assigned_agent != current_user["username"]:
            raise HTTPException(
                status_code=403,
                detail="You can update only your assigned tickets.",
            )

    # Store old team
    old_team = ticket.assigned_team

    # Update team
    ticket.assigned_team = team

    db.commit()
    db.refresh(ticket)

    # Create activity only when team actually changes
    if old_team != team:
        activity = TicketActivity(
            ticket_id=ticket.id,
            action="Team Assigned",
            description=f"Team changed from {old_team} to {team}",
        )

        db.add(activity)
        db.commit()

    return ticket


@app.put("/tickets/{ticket_id}/reply")
def update_ticket_reply(
    ticket_id: int,
    reply: str = Query(..., min_length=1, max_length=2000),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found",
        )

    # Support Agent can update replies only for assigned tickets
    if current_user["role"] == "Support Agent":
        if ticket.assigned_agent != current_user["username"]:
            raise HTTPException(
                status_code=403,
                detail="You can update replies only for your assigned tickets.",
            )

    # Update reply
    ticket.suggested_reply = reply
    ticket.reply_status = "Not Sent"

    db.commit()
    db.refresh(ticket)

    # Create activity
    activity = TicketActivity(
        ticket_id=ticket.id,
        action="Reply Updated",
        description=f"Reply was updated for Ticket #{ticket.id}",
    )

    db.add(activity)
    db.commit()

    return {
        "message": "Reply updated successfully",
        "ticket_id": ticket.id,
        "suggested_reply": ticket.suggested_reply,
        "reply_status": ticket.reply_status,
    }


# =========================================
# TICKET ACTIVITY TIMELINE
# =========================================


@app.get("/tickets/{ticket_id}/activities")
def get_ticket_activities(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found",
        )

    # Support Agent can access only activities of assigned tickets
    if current_user["role"] == "Support Agent":
        if ticket.assigned_agent != current_user["username"]:
            raise HTTPException(
                status_code=403,
                detail="You can access activities only for your assigned tickets.",
            )

    activities = (
        db.query(TicketActivity)
        .filter(TicketActivity.ticket_id == ticket_id)
        .order_by(TicketActivity.created_at.desc())
        .all()
    )

    return activities


@app.get("/analytics")
def get_analytics(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):

    # Base query
    ticket_query = db.query(models.Ticket)

    # Support Agent → only assigned tickets
    if current_user["role"] == "Support Agent":
        ticket_query = ticket_query.filter(
            models.Ticket.assigned_agent == current_user["username"]
        )

    # Get filtered tickets
    tickets = ticket_query.all()

    # Basic counts
    total_tickets = len(tickets)

    open_tickets = sum(1 for ticket in tickets if ticket.status == "Open")

    in_progress_tickets = sum(1 for ticket in tickets if ticket.status == "In Progress")

    resolved_tickets = sum(1 for ticket in tickets if ticket.status == "Resolved")

    # Priority
    high_priority_tickets = sum(1 for ticket in tickets if ticket.priority == "High")

    urgent_tickets = sum(1 for ticket in tickets if ticket.priority == "Urgent")

    # Escalation
    escalated_tickets = sum(1 for ticket in tickets if ticket.escalated == "Yes")

    # Category
    category_counts = {}

    for ticket in tickets:
        category = ticket.category

        if category not in category_counts:
            category_counts[category] = 0

        category_counts[category] += 1

    # Sentiment
    sentiment_counts = {}

    for ticket in tickets:
        sentiment = ticket.sentiment

        if sentiment not in sentiment_counts:
            sentiment_counts[sentiment] = 0

        sentiment_counts[sentiment] += 1

    return {
        "total_tickets": total_tickets,
        "open_tickets": open_tickets,
        "in_progress_tickets": in_progress_tickets,
        "resolved_tickets": resolved_tickets,
        "high_priority_tickets": high_priority_tickets,
        "urgent_tickets": urgent_tickets,
        "escalated_tickets": escalated_tickets,
        "category_counts": category_counts,
        "sentiment_counts": sentiment_counts,
    }


@app.post("/tickets/{ticket_id}/generate-reply")
def generate_ticket_reply(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Support Agent can generate replies only for their assigned tickets
    if current_user["role"] == "Support Agent":
        if ticket.assigned_agent != current_user["username"]:
            raise HTTPException(
                status_code=403,
                detail="You can generate replies only for your assigned tickets.",
            )

    # Generate AI reply
    (
        category,
        priority,
        sentiment,
        suggested_reply,
        assigned_team,
    ) = analyze_ticket(
        ticket.subject,
        ticket.description,
    )

    ticket.suggested_reply = suggested_reply
    ticket.reply_status = "Not Sent"

    db.commit()
    db.refresh(ticket)

    # Activity Timeline
    activity = TicketActivity(
        ticket_id=ticket.id,
        action="Reply Generated",
        description=f"AI reply generated for Ticket #{ticket.id}",
    )

    db.add(activity)
    db.commit()

    return {
        "message": "AI reply generated successfully",
        "ticket_id": ticket.id,
        "suggested_reply": ticket.suggested_reply,
        "reply_status": ticket.reply_status,
    }


@app.post("/tickets/{ticket_id}/send-reply")
async def send_ticket_reply(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Support Agent can send replies only for their assigned tickets
    if current_user["role"] == "Support Agent":
        if ticket.assigned_agent != current_user["username"]:
            raise HTTPException(
                status_code=403,
                detail="You can send replies only for your assigned tickets.",
            )

    if not ticket.customer_email:
        raise HTTPException(status_code=400, detail="Customer email not found")

    if not ticket.suggested_reply:
        raise HTTPException(status_code=400, detail="No reply available")

    # Send email
    try:
        await send_customer_email(
            customer_email=ticket.customer_email,
            subject=f"Re: {ticket.subject}",
            reply=ticket.suggested_reply,
        )

    except Exception:
        raise HTTPException(
            status_code=500, detail="Email sending failed. Please try again later."
        )

    # Update reply status
    ticket.reply_status = "Sent"

    db.commit()
    db.refresh(ticket)

    # Create activity only after successful email
    activity = TicketActivity(
        ticket_id=ticket.id,
        action="Reply Sent",
        description=f"Reply sent successfully to {ticket.customer_email}",
    )

    db.add(activity)
    db.commit()

    return {
        "message": "Reply sent successfully",
        "ticket_id": ticket.id,
        "reply_status": ticket.reply_status,
    }


@app.post("/auth/register")
def register_user(
    user: UserRegister,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):

    existing_user = (
        db.query(models.User)
        .filter(
            (models.User.username == user.username) | (models.User.email == user.email)
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400, detail="Username or email already registered"
        )

    try:
        hashed_password = hash_password(user.password)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        role="Support Agent",
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "username": new_user.username,
        "role": new_user.role,
    }


@app.post("/auth/login", response_model=TokenResponse)
def login_user(user: UserLogin, db: Session = Depends(get_db)):

    existing_user = (
        db.query(models.User).filter(models.User.username == user.username).first()
    )

    if not existing_user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not verify_password(user.password, existing_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    access_token = create_access_token(
        {
            "sub": existing_user.username,
            "role": existing_user.role,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@app.get("/admin/test")
def admin_test(current_user=Depends(require_admin)):
    return {
        "message": "Admin access granted",
        "username": current_user["username"],
        "role": current_user["role"],
    }


@app.get("/admin/users")
def get_all_users(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    users = db.query(models.User).all()

    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at,
        }
        for user in users
    ]


@app.post("/admin/users")
def create_support_agent(
    user: UserRegister,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    existing_user = (
        db.query(models.User)
        .filter(
            (models.User.username == user.username) | (models.User.email == user.email)
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username or email already registered",
        )

    try:
        hashed_password = hash_password(user.password)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        role="Support Agent",
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Support Agent created successfully",
        "id": new_user.id,
        "username": new_user.username,
        "email": new_user.email,
        "role": new_user.role,
    }


@app.put("/admin/users/{user_id}/role")
def update_user_role(
    user_id: int,
    role: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    allowed_roles = ["Admin", "Support Agent"]

    if role not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail="Invalid role. Use Admin or Support Agent.",
        )

    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    # Prevent admin from changing their own role
    if user.username == current_user["username"]:
        raise HTTPException(
            status_code=400,
            detail="You cannot change your own role.",
        )

    old_role = user.role
    user.role = role

    db.commit()
    db.refresh(user)

    return {
        "message": "User role updated successfully",
        "id": user.id,
        "username": user.username,
        "old_role": old_role,
        "new_role": user.role,
    }


@app.get("/admin/agent-performance")
def get_agent_performance(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    agents = db.query(models.User).filter(models.User.role == "Support Agent").all()

    performance = []

    for agent in agents:
        tickets = (
            db.query(models.Ticket)
            .filter(models.Ticket.assigned_agent == agent.username)
            .all()
        )

        total = len(tickets)

        open_tickets = sum(1 for ticket in tickets if ticket.status == "Open")

        in_progress = sum(1 for ticket in tickets if ticket.status == "In Progress")

        resolved = sum(1 for ticket in tickets if ticket.status == "Resolved")

        escalated = sum(1 for ticket in tickets if ticket.escalated == "Yes")

        performance.append(
            {
                "username": agent.username,
                "email": agent.email,
                "total_tickets": total,
                "open_tickets": open_tickets,
                "in_progress_tickets": in_progress,
                "resolved_tickets": resolved,
                "escalated_tickets": escalated,
                "resolution_rate": (
                    round((resolved / total) * 100, 2) if total > 0 else 0
                ),
            }
        )

    return performance


@app.delete("/admin/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    # Prevent admin from deleting themselves
    if user.username == current_user["username"]:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account.",
        )

    deleted_username = user.username

    db.delete(user)
    db.commit()

    return {
        "message": "User deleted successfully",
        "username": deleted_username,
    }
