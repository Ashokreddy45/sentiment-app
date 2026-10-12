# backend/app/storage.py
from sqlmodel import Session, select
from .models import engine, Review, Aspect

def save_review(text: str, source: str = None, sentiment=None, confidence=None):
    with Session(engine) as sess:
        r = Review(text=text, source=source, sentiment=sentiment, confidence=confidence, processed=bool(sentiment))
        sess.add(r)
        sess.commit()
        sess.refresh(r)
        return r

def update_review(review_id: int, sentiment: str, confidence: float):
    with Session(engine) as sess:
        r = sess.get(Review, review_id)
        if r:
            r.sentiment = sentiment
            r.confidence = confidence
            r.processed = True
            sess.add(r)
            sess.commit()
            sess.refresh(r)
        return r

def save_aspect(review_id: int, aspect: str, category: str, sentiment: str, confidence: float):
    with Session(engine) as sess:
        a = Aspect(review_id=review_id, aspect=aspect, category=category, sentiment=sentiment, confidence=confidence)
        sess.add(a)
        sess.commit()
        sess.refresh(a)
        return a

def get_reviews(limit=100, offset=0):
    with Session(engine) as sess:
        return sess.exec(select(Review).order_by(Review.created_at.desc()).offset(offset).limit(limit)).all()

def get_aspects_for_review(review_id: int):
    with Session(engine) as sess:
        return sess.exec(select(Aspect).where(Aspect.review_id==review_id)).all()
