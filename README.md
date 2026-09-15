# SupportAI — AI Customer Support System

SupportAI is a full-stack AI-powered customer support and ticket management system built with **React, FastAPI, SQLite, and Google Gemini AI**.

It helps support teams create, analyze, assign, manage, and respond to customer tickets from a centralized dashboard.

## Features

* 🔐 JWT-based authentication
* 👤 Admin and Support Agent roles
* 🎫 Customer ticket management
* 🤖 AI-powered ticket analysis
* 🏷️ Automatic category detection
* ⚡ Automatic priority detection
* 😊 Sentiment analysis
* 👥 Support team assignment
* 👨‍💻 Agent assignment
* ✍️ AI-generated customer replies
* 📝 Reply editing and saving
* 📧 Email reply sending via Gmail SMTP
* 📊 Analytics dashboard
* 🔎 Ticket search and filtering
* 🎤 Voice complaint input
* 🕒 Ticket activity timeline
* 🔒 Role-based ticket access
* 🛡️ Protected admin operations

## Tech Stack

### Frontend

* React
* Vite
* JavaScript
* CSS
* Chart.js
* React Icons

### Backend

* Python
* FastAPI
* SQLAlchemy
* SQLite
* JWT Authentication
* bcrypt
* Google Gemini API
* Gmail SMTP

## Project Structure

```text
AI-Customer-Support/
│
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── database.py
│   ├── auth.py
│   ├── ai_engine.py
│   ├── email_service.py
│   ├── requirements.txt
│   ├── .env.example
│   └── .gitignore
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── Login.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
│
├── .gitignore
└── README.md
```

## Environment Variables

Create `backend/.env`:

```env
SECRET_KEY=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
GMAIL_EMAIL=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password
```

Create `frontend/.env`:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Never commit real API keys, passwords, or `.env` files.

## Backend Setup

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend API:

```text
http://127.0.0.1:8000
```

Swagger API documentation:

```text
http://127.0.0.1:8000/docs
```

## Frontend Setup

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://127.0.0.1:5173
```

## Authentication

SupportAI uses JWT authentication.

### Admin

Admins can:

* Create tickets
* Assign agents
* Manage users
* Change user roles
* View analytics
* View agent performance
* Manage all tickets

### Support Agent

Support Agents can:

* View assigned tickets
* Update assigned ticket status
* Update priority
* Update support team
* Generate AI replies
* Edit replies
* Send customer replies
* View activity history

Agents cannot access or modify tickets assigned to other agents.

## AI Ticket Analysis

Google Gemini analyzes customer tickets and generates:

* Category
* Priority
* Sentiment
* Assigned support team
* Suggested customer reply

If Gemini is unavailable, SupportAI uses a safe fallback response.

## Email System

SupportAI can send customer replies using Gmail SMTP.

The application only marks a reply as **Sent** after the email service successfully sends the message.

## Security

Security measures include:

* JWT authentication
* Password hashing with bcrypt
* Role-based authorization
* Agent ticket isolation
* Protected admin endpoints
* Environment variable based secrets
* Database exclusion from Git
* `.env` exclusion from Git
* Password length validation
* Protected self-role modification
* Protected self-account deletion

## Production Notes

Before production deployment:

1. Configure production `VITE_API_URL`.
2. Configure production CORS origins.
3. Use a production database such as PostgreSQL.
4. Store secrets securely.
5. Use HTTPS.
6. Disable development-only configuration.
7. Perform the final security audit.

## License

This project is created for learning, portfolio, and demonstration purposes.
