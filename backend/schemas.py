from pydantic import BaseModel, EmailStr, Field


class TicketCreate(BaseModel):
    customer_name: str = Field(min_length=2, max_length=100)
    customer_email: EmailStr
    subject: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=5, max_length=5000)


class TicketResponse(BaseModel):
    id: int
    customer_name: str
    customer_email: str
    subject: str
    description: str
    category: str
    priority: str
    status: str
    sentiment: str
    assigned_team: str
    assigned_agent: str
    escalated: str
    reply_status: str
    suggested_reply: str

    class Config:
        from_attributes = True


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class UserLogin(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=72)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
