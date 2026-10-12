# backend/app/ml.py
from transformers import pipeline
import spacy
from fuzzywuzzy import process
import re
from typing import List, Dict, Tuple

# category keywords for grouping
CATEGORY_MAP = {
    "performance": ["speed","performance","lag","slow","fast","battery"],
    "features": ["camera","display","screen","feature","design"],
    "price": ["price","cost","expensive","cheap","value"],
    "service": ["service","support","warranty","customer"],
    "usability": ["easy","hard","interface","ux","ui"]
}

_sentiment_pipe = None
_nlp = None

def get_sentiment_pipeline():
    global _sentiment_pipe
    if _sentiment_pipe is None:
        _sentiment_pipe = pipeline("sentiment-analysis", return_all_scores=True)
    return _sentiment_pipe

def get_spacy():
    global _nlp
    if _nlp is None:
        try:
            _nlp = spacy.load("en_core_web_sm")
        except OSError:
            from spacy.cli import download
            download("en_core_web_sm")
            _nlp = spacy.load("en_core_web_sm")
    return _nlp

def sentence_sentiment(text: str) -> Tuple[str, float]:
    pipe = get_sentiment_pipeline()
    out = pipe(text[:512])[0]
    best = max(out, key=lambda x: x["score"])
    label = best["label"].lower()
    confidence = float(best["score"])
    if confidence < 0.60:
        return "neutral", confidence
    return ("positive" if "positive" in label else "negative"), confidence

def extract_aspects(text: str, top_k: int = 5) -> List[str]:
    nlp = get_spacy()
    doc = nlp(text)
    candidates = []
    for chunk in doc.noun_chunks:
        tok = chunk.root.lemma_.lower()
        if len(tok) > 1 and not tok.isdigit():
            candidates.append(tok)
    for token in doc:
        if token.pos_ in ("NOUN","PROPN") and not token.is_stop:
            candidates.append(token.lemma_.lower())
    cleaned = []
    for c in candidates:
        c = re.sub(r'[^a-z0-9\s\-]','', c)
        if c and c not in cleaned:
            cleaned.append(c)
    return cleaned[:top_k]

def group_aspect_to_category(aspect: str) -> str:
    choices = []
    for cat, kws in CATEGORY_MAP.items():
        choices.extend([(kw, cat) for kw in kws])
    best, score = process.extractOne(aspect, [c for c,_ in choices]) if choices else (None, 0)
    for kw, cat in choices:
        if kw == best:
            return cat
    return "other"

def analyze_text_for_aspects(text: str) -> List[Dict]:
    nlp = get_spacy()
    doc = nlp(text)
    sentences = [s.text.strip() for s in doc.sents]
    aspects = extract_aspects(text, top_k=10)
    results = []
    for aspect in aspects:
        mentions = [s for s in sentences if aspect in s.lower()]
        sentiments = []
        confidences = []
        for m in mentions:
            lab, conf = sentence_sentiment(m)
            sentiments.append(lab)
            confidences.append(conf)
        if sentiments:
            from collections import Counter
            chosen = Counter(sentiments).most_common(1)[0][0]
            avg_conf = sum(confidences)/len(confidences)
        else:
            chosen = "neutral"
            avg_conf = 0.0
        results.append({
            "aspect": aspect,
            "category": group_aspect_to_category(aspect),
            "sentiment": chosen,
            "confidence": avg_conf,
            "examples": mentions[:5]
        })
    return results
