import os
import aiosmtplib

from dotenv import load_dotenv
from email.message import EmailMessage


load_dotenv()

GMAIL_EMAIL = os.getenv("GMAIL_EMAIL")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")


async def send_customer_email(
    customer_email: str,
    subject: str,
    reply: str
):
    message = EmailMessage()

    message["From"] = GMAIL_EMAIL
    message["To"] = customer_email
    message["Subject"] = subject

    message.set_content(reply)

    await aiosmtplib.send(
        message,
        hostname="smtp.gmail.com",
        port=587,
        start_tls=True,
        username=GMAIL_EMAIL,
        password=GMAIL_APP_PASSWORD,
    )

    return True