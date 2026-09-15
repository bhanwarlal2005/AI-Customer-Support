import os
import json
from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if api_key:
    client = genai.Client(api_key=api_key)
else:
    client = None

ALLOWED_CATEGORIES = {
    "Order",
    "Payment",
    "Account",
    "Technical",
    "General",
}

ALLOWED_PRIORITIES = {
    "High",
    "Medium",
    "Low",
}

ALLOWED_SENTIMENTS = {
    "Positive",
    "Negative",
    "Neutral",
}

ALLOWED_TEAMS = {
    "Customer Support",
    "Technical Support",
    "Finance Team",
    "Order Management",
    "Sales Team",
    "General Support",
}


def analyze_ticket(subject: str, description: str):
    if client is None:
        return (
            "General",
            "Medium",
            "Neutral",
            "Thank you for contacting our support team. "
            "We have received your request and will assist you shortly.",
            "General Support",
        )

    prompt = f"""
You are an AI customer support ticket analyzer.

Analyze the following customer complaint.

Subject:
{subject}

Description:
{description}

Return ONLY valid JSON.
Do not use markdown.
Do not add any explanation.

Use exactly these fields:

{{
    "category": "Order | Payment | Account | Technical | General",
    "priority": "High | Medium | Low",
    "sentiment": "Positive | Negative | Neutral",
    "assigned_team": "Customer Support | Technical Support | Finance Team | Order Management | Sales Team | General Support",
    "suggested_reply": "Professional reply to the customer"
}}

Rules:

1. Order issues → Order Management
2. Payment/refund/money issues → Finance Team
3. Login/password/account issues → Customer Support
4. Technical/error/bug issues → Technical Support
5. Other issues → General Support
6. Urgent, emergency, critical or immediate issues → High priority
7. Normal problems/delays/issues → Medium priority
8. Simple/general requests → Low priority
9. Reply should be polite, professional and helpful.
10. Never invent order IDs, refund amounts, dates or other facts not provided by the customer.
"""

    try:

        response = client.models.generate_content(
            model="gemini-3.6-flash", contents=prompt
        )

        result = json.loads(response.text)

        category = result.get("category", "General")
        priority = result.get("priority", "Medium")
        sentiment = result.get("sentiment", "Neutral")
        assigned_team = result.get("assigned_team", "General Support")
        suggested_reply = result.get(
            "suggested_reply", "Thank you for contacting our support team."
        )

        if category not in ALLOWED_CATEGORIES:
            category = "General"

        if priority not in ALLOWED_PRIORITIES:
            priority = "Medium"

        if sentiment not in ALLOWED_SENTIMENTS:
            sentiment = "Neutral"

        if assigned_team not in ALLOWED_TEAMS:
            assigned_team = "General Support"

        if not isinstance(suggested_reply, str) or not suggested_reply.strip():
            suggested_reply = (
                "Thank you for contacting our support team. "
                "We have received your request and will assist you shortly."
            )
        elif len(suggested_reply) > 2000:
            suggested_reply = suggested_reply[:2000]

        return (category, priority, sentiment, suggested_reply, assigned_team)

    except Exception:

        print("Gemini AI request failed.")

        # Safe fallback
        return (
            "General",
            "Medium",
            "Neutral",
            "Thank you for contacting our support team. "
            "We have received your request and will assist you shortly.",
            "General Support",
        )
