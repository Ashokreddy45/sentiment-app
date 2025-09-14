from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from textblob import TextBlob
from nltk.sentiment.vader import SentimentIntensityAnalyzer
import nltk
import io
from typing import List, Dict, Any, Optional
from collections import defaultdict
import spacy
from langdetect import detect

# Transformers (optional)
try:
    from transformers import pipeline
except ImportError:
    pipeline = None

app = FastAPI(title="Advanced Sentiment Analysis API")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Globals
transformer_classifier: Optional[Any] = None
nlp = spacy.load("en_core_web_sm")


@app.on_event("startup")
def load_resources():
    try:
        nltk.download("vader_lexicon")
    except Exception as e:
        print("Warning: Failed to download vader_lexicon:", e)

    global transformer_classifier
    if pipeline:
        try:
            transformer_classifier = pipeline("sentiment-analysis")
        except Exception as e:
            print("Warning: Transformers pipeline not available:", e)


@app.get("/")
def read_root():
    return {"message": "Advanced Sentiment Analysis API running."}


def detect_text_column(df: pd.DataFrame) -> Optional[str]:
    candidates = ["text", "message", "content", "comment", "tweet", "review", "body"]
    for c in candidates:
        for col in df.columns:
            if col.lower().strip() == c:
                return col
    for col in df.columns:
        if pd.api.types.is_string_dtype(df[col]):
            return col
    return None


def detect_language(text: str) -> str:
    try:
        return detect(text)
    except:
        return "en"


def keyword_sentiment(rows: List[Dict[str, Any]]) -> Dict[str, float]:
    keyword_scores = defaultdict(list)
    for r in rows:
        doc = nlp(r["text"])
        for chunk in doc.noun_chunks:
            keyword_scores[chunk.text.lower()].append(r["score"])
    return {k: sum(v) / len(v) for k, v in keyword_scores.items() if len(v) >= 2}


def extract_entities(rows: List[Dict[str, Any]]) -> Dict[str, Dict[str, int]]:
    entities = defaultdict(lambda: {"Positive": 0, "Negative": 0, "Neutral": 0})
    for r in rows:
        doc = nlp(r["text"])
        for ent in doc.ents:
            entities[ent.text][r["sentiment"]] += 1
    return dict(entities)


def detect_alerts(bucket_counts: List[Dict[str, int]]) -> List[str]:
    alerts = []
    prev_score = None
    for i, b in enumerate(bucket_counts):
        score = b["Positive"] - b["Negative"]
        if prev_score is not None and abs(score - prev_score) > 0.2:
            alerts.append(f"Significant sentiment change at bucket {i+1}")
        prev_score = score
    return alerts


@app.post("/analyze-sentiment")
async def analyze_sentiment(
    file: UploadFile = File(...),
    model_type: str = Form(...),
    output_type: str = Form("detailed"),
    viz_type: str = Form("bar"),
    region_col: Optional[str] = Form(None),
    source_col: Optional[str] = Form(None)
) -> Dict[str, Any]:

    try:
        contents = await file.read()
        try:
            s = contents.decode("utf-8")
        except Exception:
            s = contents.decode("latin1")
        df = pd.read_csv(io.StringIO(s))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read CSV: {e}")

    text_col = detect_text_column(df)
    if not text_col:
        raise HTTPException(status_code=400, detail="CSV must have a text column.")

    vader_analyzer = SentimentIntensityAnalyzer() if model_type == "vader" else None
    if model_type == "transformers" and transformer_classifier is None:
        raise HTTPException(status_code=503, detail="Transformer model unavailable.")

    rows: List[Dict[str, Any]] = []
    for _, val in df[text_col].fillna("").items():
        text = str(val).strip()
        if not text:
            continue

        lang = detect_language(text)
        if model_type == "textblob":
            polarity = TextBlob(text).sentiment.polarity
            score = round(float(polarity), 4)
            sentiment_label = "Positive" if polarity > 0 else ("Negative" if polarity < 0 else "Neutral")

        elif model_type == "vader":
            s = vader_analyzer.polarity_scores(text)["compound"]
            score = round(float(s), 4)
            sentiment_label = "Positive" if s >= 0.05 else ("Negative" if s <= -0.05 else "Neutral")

        elif model_type == "transformers":
            try:
                res = transformer_classifier(text)[0]
                label = res.get("label", "NEUTRAL").upper()
                sentiment_label = "Positive" if label.startswith("POS") else ("Negative" if label.startswith("NEG") else "Neutral")
                score = round(float(res.get("score", 0.0)), 4)
            except Exception:
                sentiment_label, score = "Neutral", 0.0
        else:
            raise HTTPException(status_code=400, detail=f"Invalid model_type '{model_type}'")

        rows.append({"text": text, "score": score, "sentiment": sentiment_label, "language": lang})

    if not rows:
        raise HTTPException(status_code=400, detail="No valid text rows found.")

    total = len(rows)
    counts = {"Positive": 0, "Negative": 0, "Neutral": 0}
    for r in rows:
        counts[r["sentiment"]] += 1

    summary = {
        "total": total,
        "counts": counts,
        "positive_pct": round(counts["Positive"] / total * 100, 2),
        "negative_pct": round(counts["Negative"] / total * 100, 2),
        "neutral_pct": round(counts["Neutral"] / total * 100, 2),
        "average_score": round(sum(r["score"] for r in rows) / total, 4),
    }

    # Buckets for visualization
    bins = min(24, max(3, total // 5))
    bucket_counts: List[Dict[str, int]] = []
    chunk = max(1, total // bins)
    for i in range(bins):
        part = rows[i*chunk:i*chunk + chunk]
        pc = {"Positive": 0, "Negative": 0, "Neutral": 0}
        for p in part:
            pc[p["sentiment"]] += 1
        bucket_counts.append(pc)

    # Keyword, entity, alerts
    keywords = keyword_sentiment(rows)
    entities = extract_entities(rows)
    alerts = detect_alerts(bucket_counts)

    # Geo & source insights
    geo_counts = {}
    source_counts = {}
    if region_col and region_col in df.columns:
        geo_counts = df.groupby(region_col)[text_col].apply(lambda x: sum(TextBlob(t).sentiment.polarity>0 for t in x)).to_dict()
    if source_col and source_col in df.columns:
        source_counts = df.groupby(source_col)[text_col].apply(lambda x: sum(TextBlob(t).sentiment.polarity>0 for t in x)).to_dict()

    return {
        "model_type": model_type,
        "viz_type": viz_type,
        "summary": summary,
        "buckets": bucket_counts,
        "alerts": alerts,
        "keywords": keywords,
        "entities": entities,
        "geo_counts": geo_counts,
        "source_counts": source_counts,
        "results": rows if output_type=="detailed" else []
    }
