import API_BASE_URL from "../api";
import React, { useState, useCallback } from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import {
  Zap,
  ThumbsUp,
  ThumbsDown,
  Meh,
  X,
  BookOpen,
  Settings,
  Star,
  Cpu,
  Feather,
} from "lucide-react";

import "../manual.css";

// --- Model Configuration ---
const modelMap = {
  "Sentiment (auto)": { key: "sentiment", icon: Zap, color: "indigo" },
  TextBlob: { key: "textblob", icon: Feather, color: "sky" },
  VADER: { key: "vader", icon: Star, color: "teal" },
  "Transformers (BERT)": { key: "transformers", icon: Cpu, color: "purple" },
  "Aspect-Based Sentiment": { key: "aspect", icon: Settings, color: "rose" },
};

const modelDescriptions = Object.entries(modelMap).map(([name, config]) => ({
  name,
  key: config.key,
  icon: config.icon,
  color: config.color,
  description:
    name === "Sentiment (auto)"
      ? "Automatically selects the best sentiment model. Balanced general analysis."
      : name === "TextBlob"
      ? "Rule-based lexicon model. Fast and simple."
      : name === "VADER"
      ? "Optimized for short/informal texts like social media."
      : name === "Transformers (BERT)"
      ? "Deep contextual model. High accuracy for detailed reviews."
      : "Aspect-level sentiment (requires aspects input).",
}));

const getSentimentIconAndColor = (label) => {
  switch (label?.toLowerCase()) {
    case "positive":
      return { icon: ThumbsUp, color: "manual-green" };
    case "negative":
      return { icon: ThumbsDown, color: "manual-red" };
    case "neutral":
      return { icon: Meh, color: "manual-yellow" };
    default:
      return { icon: BookOpen, color: "manual-gray" };
  }
};

// --- Toast Component ---
const Toast = ({ message, type, onClose }) => {
  if (!message) return null;
  const colorClass =
    type === "error" ? "manual-toast-error" : "manual-toast-success";
  return (
    <div className={`manual-toast ${colorClass}`}>
      <span>{message}</span>
      <button onClick={onClose}>
        <X />
      </button>
    </div>
  );
};

// --- Result Display ---
const ResultDisplay = ({ result, mode }) => {
  if (!result) return null;

  const { sentiment, score, aspects, text } = result;

  const recommendation =
    mode === "buy"
      ? sentiment.toLowerCase() === "positive"
        ? "✅ Buy"
        : "❌ Don't Buy"
      : null;

  if (aspects) {
    return (
      <div className="manual-result-grid">
        {Object.entries(aspects).map(([asp, info]) => {
          const { icon: Icon, color } = getSentimentIconAndColor(info.label);
          return (
            <div key={asp} className={`manual-result-card ${color}`}>
              <div className="manual-result-header">
                <span>{asp}</span>
                <Icon />
              </div>
              <p>Sentiment: {info.label}</p>
              <p>Confidence: {(info.score * 100).toFixed(2)}%</p>
            </div>
          );
        })}
      </div>
    );
  }

  const { icon: Icon } = getSentimentIconAndColor(sentiment);
  const normalized = (score + 1) * 50;

  return (
    <div className="manual-overall-result">
      <p className="manual-review-text">
        <strong>Review:</strong> {text}
      </p>
      <div className="manual-overall-header">
        <Icon />
        <h3>Sentiment Analysis</h3>
      </div>
      <p>Sentiment: {sentiment}</p>
      <div className="manual-progress-bar">
        <div
          className="manual-progress-fill"
          style={{ width: `${normalized}%` }}
        />
      </div>
      <p>Score: {score.toFixed(4)}</p>
      {mode === "buy" && (
        <div className="manual-overall-recommendation">
          <strong>Recommendation:</strong> {recommendation}
        </div>
      )}
    </div>
  );
};

// --- Manual Component ---
const Manual = () => {
  const [manualText, setManualText] = useState("");
  const [uploadedFileText, setUploadedFileText] = useState(""); // NEW: uploaded file
  const [aspects, setAspects] = useState("");
  const [modelKey, setModelKey] = useState("sentiment");
  const [mode, setMode] = useState("normal"); // normal or buy
  const [results, setResults] = useState([]);
  const [overallRecommendation, setOverallRecommendation] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "" });

  const selectedModel = modelDescriptions.find((m) => m.key === modelKey);
  const ModelIcon = selectedModel?.icon || Zap;

  const showToast = useCallback((msg, type = "info") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast({ message: "", type: "" }), 4000);
  }, []);

  // --- Submit Handler ---
  const handleSubmit = async () => {
    const inputText = uploadedFileText || manualText;
    if (!inputText.trim())
      return showToast("Please enter text or upload a file.", "error");

    setLoading(true);
    setResults([]);
    setOverallRecommendation("");

    try {
      const reviews = inputText
        .split(/\n+/)
        .map((r) => r.trim())
        .filter(Boolean);

      if (reviews.length === 0) {
        showToast("No valid reviews found.", "error");
        setLoading(false);
        return;
      }

      const requestedAspects = aspects
        .split(",")
        .map((aspect) => aspect.trim())
        .filter(Boolean);

      if (modelKey === "aspect" && requestedAspects.length === 0) {
        showToast("Enter at least one aspect, such as battery or screen.", "error");
        setLoading(false);
        return;
      }

      const endpoint = modelKey === "aspect"
        ? `${API_BASE_URL}/aspect-sentiment`
        : `${API_BASE_URL}/analyze-manual`;

      const promises = reviews.map((review) =>
        axios.post(endpoint, modelKey === "aspect"
          ? {
              text: review,
              aspects: requestedAspects,
              model_type: "textblob",
            }
          : {
              text: review,
              mode: "sentiment",
              model_type: modelKey === "sentiment" ? "auto" : modelKey,
            }
        )
      );

      const responses = await Promise.all(promises);
      const analyzed = responses.map((res, idx) => ({
        text: reviews[idx],
        sentiment: res.data.sentiment || "neutral",
        score: res.data.score || 0,
        aspects: res.data.aspects || null,
      }));

      setResults(analyzed);

      // --- Calculate overall recommendation for buy mode ---
      if (mode === "buy") {
        const positiveCount = analyzed.filter(
          (r) => r.sentiment.toLowerCase() === "positive"
        ).length;
        const negativeCount = analyzed.filter(
          (r) => r.sentiment.toLowerCase() === "negative"
        ).length;

        const overall =
          positiveCount >= negativeCount ? "✅ Buy" : "❌ Don't Buy";
        setOverallRecommendation(overall);
      }

      showToast("Analysis complete!", "success");
    } catch (err) {
      showToast(
        err.response?.data?.detail || "Failed to connect to backend.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // --- File Upload Handler ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedFileText(event.target.result);
      setManualText(""); // Clear manual input
      showToast("File loaded successfully!", "success");
    };
    reader.readAsText(file);
  };

  const downloadJSON = () => {
    if (results.length === 0) return;
    saveAs(
      new Blob(
        [JSON.stringify({ results, mode, overallRecommendation }, null, 2)],
        {
          type: "application/json",
        }
      ),
      "manual_results.json"
    );
    showToast("JSON downloaded.", "success");
  };

  return (
    <div className="manual-container">
      <h1 className="manual-title">Manual Sentiment Analyzer</h1>
      <div className="manual-content">
        <div className="manual-left">
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Paste multiple reviews here, one per line..."
            rows={8}
            className="manual-textarea"
            disabled={loading || uploadedFileText.length > 0} // Disable if file is uploaded
          />
          {mode === "buy" && (
            <input
              type="file"
              accept=".txt,.csv"
              onChange={handleFileUpload}
              className="manual-file-input"
              disabled={loading}
            />
          )}
          {modelKey === "aspect" && (
            <input
              type="text"
              placeholder="Aspects: battery, screen, etc."
              value={aspects}
              onChange={(e) => setAspects(e.target.value)}
              className="manual-aspects"
              disabled={loading}
            />
          )}
          <select
            value={modelKey}
            onChange={(e) => setModelKey(e.target.value)}
            className="manual-select"
            disabled={loading}
          >
            {modelDescriptions.map((m) => (
              <option key={m.key} value={m.key}>
                {m.name}
              </option>
            ))}
          </select>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="manual-select"
            disabled={loading}
          >
            <option value="normal">Normal Sentiment</option>
            <option value="buy">Buying Recommendation</option>
          </select>
          <div className="manual-buttons">
            <button onClick={handleSubmit} disabled={loading}>
              {loading ? "Analyzing..." : "Run Analysis"}
            </button>
            <button
              onClick={() => {
                setManualText("");
                setUploadedFileText("");
                setAspects("");
                setResults([]);
                setOverallRecommendation("");
                showToast("Input cleared.", "success");
              }}
            >
              Clear
            </button>
            <button onClick={downloadJSON} disabled={results.length === 0}>
              Download JSON
            </button>
          </div>
        </div>
        <div className="manual-right">
          {results.length > 0 ? (
            <>
              {results.map((res, idx) => (
                <ResultDisplay key={idx} result={res} mode={mode} />
              ))}
              {mode === "buy" && overallRecommendation && (
                <div className="manual-overall-final">
                  <h2>Overall Recommendation: {overallRecommendation}</h2>
                </div>
              )}
            </>
          ) : (
            <div className="manual-placeholder">Results will appear here.</div>
          )}
        </div>
      </div>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "" })}
      />
    </div>
  );
};

export default Manual;
