# backend/app/tasks.py
import os
from celery import Celery
from .ml import sentence_sentiment, analyze_text_for_aspects
from .storage import update_review, save_aspect
from .models import init_db

CELERY_BROKER = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_BACKEND = os.getenv("CELERY_RESULT_BACKEND", CELERY_BROKER)

celery_app = Celery("tasks", broker=CELERY_BROKER, backend=CELERY_BACKEND)

@celery_app.task
def process_review(review_id: int, text: str):
    init_db()
    sentiment, confidence = sentence_sentiment(text)
    update_review(review_id, sentiment, confidence)
    aspects = analyze_text_for_aspects(text)
    for a in aspects:
        save_aspect(review_id=review_id, aspect=a["aspect"], category=a["category"], sentiment=a["sentiment"], confidence=a["confidence"])
    return {"review_id": review_id, "aspects": len(aspects)}
