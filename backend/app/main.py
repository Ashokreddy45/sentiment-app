import os
from dotenv import load_dotenv
from sqlalchemy.engine import URL
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from textblob import TextBlob
from nltk.sentiment.vader import SentimentIntensityAnalyzer
import nltk
import io
from typing import List, Dict, Any, Optional
import spacy
import subprocess
import logging
from passlib.context import CryptContext
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime
from collections import Counter

# Optional Transformers
try:
    from transformers import pipeline
except Exception:
    pipeline = None

# --------------------------- App Config --------------------------- #
app = FastAPI(title="Sentiment & ABSA API", version="2.3.0")
frontend_urls = os.getenv("FRONTEND_URLS", "http://localhost:5173")
allowed_origins = [
    origin.strip().rstrip("/")
    for origin in frontend_urls.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sentiment-app")

# --------------------------- Database Setup --------------------------- #
load_dotenv()

database_url = URL.create(
    drivername="mysql+mysqlconnector",
    username=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", "3306")),
    database=os.getenv("DB_NAME", "sentiment_app"),
)

engine = create_engine(
    database_url,
    echo=False,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, future=True)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class AnalysisHistory(Base):
    __tablename__ = "analysis_history"
    id = Column(Integer, primary_key=True, index=True)
    review_text = Column(Text, nullable=False)
    sentiment = Column(String(20))
    recommendation = Column(String(20))
    analysis_date = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --------------------------- Password --------------------------- #
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --------------------------- NLP Resources --------------------------- #
transformer_classifier: Optional[Any] = None
absa_pipeline: Optional[Any] = None
vader_analyzer: Optional[Any] = None
nlp: Optional[Any] = None


@app.on_event("startup")
def load_resources():
    """Load lightweight resources only; avoid downloads during deployment startup."""
    global transformer_classifier, absa_pipeline, vader_analyzer, nlp

    transformer_classifier = None
    absa_pipeline = None
    nlp = None

    try:
        vader_analyzer = SentimentIntensityAnalyzer()
    except LookupError:
        try:
            nltk.download("vader_lexicon", quiet=True)
            vader_analyzer = SentimentIntensityAnalyzer()
        except Exception as exc:
            logger.warning("VADER resource unavailable: %s", exc)
            vader_analyzer = None
    except Exception as exc:
        logger.warning("VADER initialization failed: %s", exc)
        vader_analyzer = None

    logger.info("Lightweight startup complete; optional NLP models are disabled.")

# --------------------------- Helper Functions --------------------------- #
def map_label_from_transformer(label: str) -> str:
    label = label.upper()
    if "POSITIVE" in label:
        return "Positive"
    if "NEGATIVE" in label:
        return "Negative"
    return "Neutral"


def analyze_absa(text: str) -> List[Dict[str, Any]]:
    if absa_pipeline is None:
        return []
    try:
        results = absa_pipeline(text)
        if results and isinstance(results, list) and 'label' in results[0]:
            label = results[0]['label']
            mapped_label = map_label_from_transformer(label)
            score = results[0].get('score', 0.0)
            return [{
                "aspect": "overall",
                "sentiment": mapped_label,
                "score": score
            }]
        return []
    except Exception as e:
        logger.error(f"ABSA analysis failed: {e}")
        return []


def analyze_text_with_model(text: str, model_type: str):
    model_type = model_type.lower()
    if model_type == "textblob":
        polarity = TextBlob(text).sentiment.polarity
        label = "Positive" if polarity > 0 else ("Negative" if polarity < 0 else "Neutral")
        return label, round(float(polarity), 4)

    if model_type == "vader":
        s = vader_analyzer.polarity_scores(text)["compound"]
        label = "Positive" if s >= 0.05 else ("Negative" if s <= -0.05 else "Neutral")
        return label, round(float(s), 4)

    if transformer_classifier:
        try:
            res = transformer_classifier(text)[0]
            label = map_label_from_transformer(res.get("label", "NEUTRAL"))
            score = float(res.get("score", 0.0))
            return label, round(score, 4)
        except Exception as e:
            logger.error(f"Transformer classification failed, falling back to TextBlob: {e}")
            polarity = TextBlob(text).sentiment.polarity
            label = "Positive" if polarity > 0 else ("Negative" if polarity < 0 else "Neutral")
            return label, round(float(polarity), 4)

    polarity = TextBlob(text).sentiment.polarity
    label = "Positive" if polarity > 0 else ("Negative" if polarity < 0 else "Neutral")
    return label, round(float(polarity), 4)


def save_history(db: Session, review_text: str, sentiment: str):
    recommendation = "✅ Buy" if sentiment == "Positive" else "❌ Don't Buy"
    record = AnalysisHistory(
        review_text=review_text,
        sentiment=sentiment,
        recommendation=recommendation
    )
    db.add(record)
    db.commit()


# --------------------------- Auth Endpoints --------------------------- #
@app.post("/register")
def register(email: str = Body(...), password: str = Body(...), db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="User already exists")
    hashed_pw = pwd_context.hash(password)
    user = User(email=email, password=hashed_pw)
    db.add(user)
    db.commit()
    return {"message": "Registration successful"}


@app.post("/login")
def login(email: str = Body(...), password: str = Body(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user or not pwd_context.verify(password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"message": "Login successful", "token": "dummy-token"}


# --------------------------- History Endpoint --------------------------- #
@app.get("/history")
def get_history(search: str = "", start_date: str = None, end_date: str = None, db: Session = Depends(get_db)):
    query = db.query(AnalysisHistory)
    if search:
        query = query.filter(AnalysisHistory.review_text.ilike(f"%{search}%"))
    if start_date:
        start_dt = datetime.fromisoformat(start_date)
        query = query.filter(AnalysisHistory.analysis_date >= start_dt)
    if end_date:
        end_dt = datetime.fromisoformat(end_date)
        query = query.filter(AnalysisHistory.analysis_date <= end_dt)

    results = query.order_by(AnalysisHistory.analysis_date.desc()).all()
    return {"history": [
        {
            "id": r.id,
            "review_text": r.review_text,  # ✅ include full review text here
            "sentiment": r.sentiment,
            "recommendation": r.recommendation,
            "date": r.analysis_date.isoformat()
        } for r in results
    ]}


# --------------------------- CSV / File Analysis --------------------------- #
@app.post("/analyze-file")
async def analyze_file(
    file: UploadFile = File(...),
    model_type: str = Form(...),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith((".csv", ".txt")):
        raise HTTPException(status_code=400, detail="Only CSV or TXT files supported")

    content = await file.read()
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content), header=None)
            texts = df.iloc[:, 0].astype(str).tolist()
        else:
            texts = content.decode("utf-8").splitlines()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {e}")

    results = []
    summary_counts = {"Positive": 0, "Negative": 0, "Neutral": 0}

    for t in texts:
        if not t.strip():
            continue

        if model_type.lower() == "aspect":
            aspect_sentiments = analyze_absa(t)
            if not aspect_sentiments:
                label, score = analyze_text_with_model(t, "textblob")
            else:
                sentiments = [a['sentiment'] for a in aspect_sentiments]
                if sentiments:
                    label = Counter(sentiments).most_common(1)[0][0]
                    scores = [a['score'] for a in aspect_sentiments if a['sentiment'] == label]
                    score = sum(scores) / len(scores) if scores else 0
                else:
                    label, score = "Neutral", 0
        else:
            label, score = analyze_text_with_model(t, model_type)
            aspect_sentiments = []

        results.append({
            "review_text": t,  # ✅ include full review text in response
            "sentiment": label,
            "score": round(score, 4)
        })
        summary_counts[label] += 1
        save_history(db, t, label)

    trend_data = {str(i + 1): r["score"] for i, r in enumerate(results)}

    return {
        "results": results,
        "summary": {"counts": summary_counts},
        "trend": trend_data,
        "model_type": model_type
    }


# --------------------------- Manual / Single Text Analysis --------------------------- #
class ManualAnalysisRequest(BaseModel):
    text: str
    mode: Optional[str] = "sentiment"
    model_type: Optional[str] = "textblob"


@app.post("/analyze-manual")
def analyze_manual(req: ManualAnalysisRequest, db: Session = Depends(get_db)):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    model_choice = req.model_type.lower()
    sentiment, score = analyze_text_with_model(text, model_choice)
    recommendation = "✅ Buy" if sentiment == "Positive" else "❌ Don't Buy"
    save_history(db, text, sentiment)

    return {
        "review_text": text,  # ✅ include review text
        "sentiment": sentiment,
        "score": score,
        "recommendation": recommendation
    }




# --------------------------- Aspect Sentiment Analysis --------------------------- #
class AspectAnalysisRequest(BaseModel):
    text: str
    aspects: List[str] = []
    model_type: Optional[str] = "textblob"


@app.post("/aspect-sentiment")
def analyze_aspect_sentiment(req: AspectAnalysisRequest, db: Session = Depends(get_db)):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    if not req.aspects:
        raise HTTPException(status_code=400, detail="Provide at least one aspect")

    import re

    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    aspect_results = {}

    for aspect in req.aspects:
        aspect = aspect.strip()
        if not aspect:
            continue

        matching = [
            sentence for sentence in sentences
            if re.search(r"\b" + re.escape(aspect) + r"\b", sentence, re.IGNORECASE)
        ]

        if not matching:
            aspect_results[aspect] = {"label": "Neutral", "score": 0.0}
            continue

        context = " ".join(matching)
        model_choice = (req.model_type or "textblob").lower()
        if model_choice in {"aspect", "sentiment", "auto", "transformers"}:
            model_choice = "textblob"

        label, score = analyze_text_with_model(context, model_choice)
        aspect_results[aspect] = {"label": label, "score": abs(float(score))}

    label, score = analyze_text_with_model(
        text,
        req.model_type if (req.model_type or "").lower() in {"textblob", "vader"} else "textblob"
    )
    save_history(db, text, label)

    return {
        "review_text": text,
        "sentiment": label,
        "score": score,
        "aspects": aspect_results
    }

# --------------------------- Root Endpoint --------------------------- #
@app.get("/")
def root():
    return {"message": "✅ Sentiment Analysis API is running!"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
