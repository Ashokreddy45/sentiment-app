import API_BASE_URL from "../api";
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Bar, Line, Pie } from "react-chartjs-2";
import { saveAs } from "file-saver";
import * as htmlToImage from "html-to-image";
import JSZip from "jszip";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  ArcElement,
  Title,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

// ---------------- Helper Functions ---------------- //
const processAspectData = (results) => {
  const aspectData = {};
  results.forEach((r) => {
    if (Array.isArray(r.aspect_sentiments)) {
      r.aspect_sentiments.forEach((info) => {
        const aspect = info.aspect || "unknown";
        const sentiment = info.sentiment || "Neutral";
        if (!aspectData[aspect]) {
          aspectData[aspect] = { Positive: 0, Negative: 0, Neutral: 0, totalScore: 0, count: 0 };
        }
        aspectData[aspect][sentiment] += 1;
        aspectData[aspect].totalScore += info.score || 0;
        aspectData[aspect].count += 1;
      });
    }
  });
  return aspectData;
};

const modelDescriptions = [
  { name: "sentiment", display: "Sentiment (auto)", description: "Automatically selects the best sentiment model." },
  { name: "textblob", display: "TextBlob", description: "Simple, rule-based sentiment analysis." },
  { name: "vader", display: "VADER", description: "Lexicon and rule-based for social media." },
  { name: "transformers", display: "Transformers (BERT)", description: "High accuracy, understands context." },
  { name: "aspect", display: "Aspect-Based Sentiment", description: "Fine-grained insights for specific aspects." },
];

const vibrantColors = [
  { value: "#8b5cf6", label: "Violet" },
  { value: "#38bdf8", label: "Sky Blue" },
  { value: "#ef4444", label: "Red" },
  { value: "#22d3ee", label: "Cyan" },
  { value: "#f59e42", label: "Orange" },
  { value: "#10b981", label: "Green" },
];

// ---------------- Dashboard Component ---------------- //
const Dashboard = () => {
  const [theme] = useState("dark");
  const [vibrantMain] = useState(vibrantColors[0].value);
  const [file, setFile] = useState(null);
  const [model, setModel] = useState("sentiment");
  const [chartType, setChartType] = useState("bar");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aspects, setAspects] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(0);

  const resultsPerPage = 10;
  const chartRef = useRef(null);
  const trendRef = useRef(null);

  // ---------------- Theme & Title ---------------- //
  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    if (theme === "vibrant") document.body.style.setProperty("--vibrant-main", vibrantMain);
    document.title = result ? "Analysis Results - AI Sentiment Dashboard" : "AI Sentiment Dashboard";
  }, [theme, vibrantMain, result]);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  // ---------------- Submit Analysis ---------------- //
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setResult(null);
    setSearchQuery("");
    setSentimentFilter("all");
    setCurrentPage(0);

    if (!file) {
      alert("Please upload a CSV or TXT file for analysis.");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("model_type", model);

      const res = await axios.post(`${API_BASE_URL}/analyze-file`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(res.data);
    } catch (err) {
      alert("Error during sentiment analysis: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Filtering & Pagination ---------------- //
  let filteredResults = [];
  if (result && Array.isArray(result.results)) {
    filteredResults = result.results.filter((row) => {
      const textToSearch = (row.review_text
 || row.review_id?.toString() || "").toLowerCase();
      const query = searchQuery.toLowerCase();
      const textMatches = textToSearch.includes(query);
      let sentimentMatches = true;
      if (sentimentFilter !== "all") {
        if (result.model_type === "aspect") {
          sentimentMatches = (row.aspect_sentiments || []).some(
            (info) => (info.sentiment || "").toLowerCase() === sentimentFilter
          );
        } else {
          sentimentMatches = (row.sentiment || "neutral").toLowerCase() === sentimentFilter;
        }
      }
      return textMatches && sentimentMatches;
    });
  }

  const totalPages = Math.ceil(filteredResults.length / resultsPerPage);
  const paginatedResults = filteredResults.slice(currentPage * resultsPerPage, (currentPage + 1) * resultsPerPage);

  // ---------------- Downloads ---------------- //
  const downloadJSON = () => {
    if (!result) return;
    const filename = result.model_type === "aspect" ? "aspect_results.json" : "sentiment_results.json";
    saveAs(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }), filename);
  };

  const downloadCSV = () => {
    if (!result || !Array.isArray(result.results)) return;
    let csv = '';
    if (result.model_type === "aspect") {
      const headers = ["Review", "Aspect", "Label", "Score"];
      const rows = result.results.flatMap(r =>
        (r.aspect_sentiments || []).map(info =>
          [`"${(r.review_text || r.review_id || "").toString().replace(/"/g, '""')}"`, `"${info.aspect}"`, `"${info.sentiment}"`, `"${info.score}"`].join(",")
        )
      );
      csv = [headers.join(",")].concat(rows).join("\n");
    } else {
      const headers = Object.keys(result.results[0]);
      const rows = result.results.map(r => headers.map(h => `"${(r[h] ?? "").toString().replace(/"/g,'""')}"`).join(","));
      csv = [headers.join(",")].concat(rows).join("\n");
    }
    saveAs(new Blob([csv], { type: "text/csv" }), "sentiment_results.csv");
  };

  const copySummary = () => {
    if (!result || !result.summary) return;
    const s = result.summary.counts || {};
    navigator.clipboard.writeText(
      `Positive: ${s.Positive || 0}, Negative: ${s.Negative || 0}, Neutral: ${s.Neutral || 0}`
    ).then(() => alert("Summary copied!"));
  };

  const exportAll = async () => {
    if (!result || !Array.isArray(result.results)) return;
    const zip = new JSZip();
    zip.file("results.json", JSON.stringify(result, null, 2));
    try {
      if (chartRef.current) {
        const chartDataUrl = await htmlToImage.toPng(chartRef.current, { backgroundColor: "#1e293b" });
        zip.file("sentiment_distribution.png", await (await fetch(chartDataUrl)).blob());
      }
      if (trendRef.current) {
        const trendDataUrl = await htmlToImage.toPng(trendRef.current, { backgroundColor: "#1e293b" });
        zip.file("sentiment_trend.png", await (await fetch(trendDataUrl)).blob());
      }
    } catch (error) {
      console.error("Could not add chart images to export:", error);
    }
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "analysis_export.zip");
  };

  // ---------------- Charts ---------------- //
  const renderChart = () => {
    if (!result?.summary?.counts || result.model_type === "aspect") return null;
    const labels = Object.keys(result.summary.counts || {});
    const values = Object.values(result.summary.counts || {});
    const chartData = {
      labels,
      datasets: [{
        label: "Sentiment Distribution",
        data: values,
        backgroundColor: ["rgba(74, 222, 128, 0.8)", "rgba(248, 113, 113, 0.8)", "rgba(96, 165, 250, 0.8)"],
        borderWidth: 1,
        borderRadius: 10,
      }],
    };
    const options = {
      responsive: true,
      plugins: { legend: { labels: { color: "white" } } },
      scales: {
        x: { ticks: { color: "white" }, grid: { display: false } },
        y: { ticks: { color: "white" }, grid: { color: "rgba(255,255,255,0.1)" } }
      }
    };
    if (chartType === "bar") return <Bar ref={chartRef} data={chartData} options={options} />;
    if (chartType === "line") return <Line ref={chartRef} data={chartData} options={options} />;
    if (chartType === "pie") return <Pie ref={chartRef} data={chartData} options={options} />;
    return null;
  };

  const renderTrend = () => {
    if (!result?.trend || Object.keys(result.trend).length === 0 || result.model_type === "aspect") return null;
    const labels = Object.keys(result.trend || {});
    const values = Object.values(result.trend || {});
    const trendData = {
      labels,
      datasets: [{
        label: "Average Sentiment Trend",
        data: values,
        borderColor: "rgba(255,206,86,1)",
        backgroundColor: "rgba(255,206,86,0.23)",
        tension: 0.3,
        fill: true
      }]
    };
    const options = { responsive: true, plugins: { legend: { labels: { color: "white" } } } };
    return <Line ref={trendRef} data={trendData} options={options} />;
  };

  const renderAspectVisualization = () => {
    if (!result || result.model_type !== "aspect" || !Array.isArray(result.results)) return null;
    const aspectData = processAspectData(result.results);
    const aspects = Object.keys(aspectData);
    if (aspects.length === 0) return <p className="text-slate-400 text-center">No aspect data available.</p>;

    const labels = aspects;
    const positiveData = aspects.map(a => aspectData[a].Positive);
    const negativeData = aspects.map(a => aspectData[a].Negative);
    const neutralData = aspects.map(a => aspectData[a].Neutral);

    const barData = {
      labels,
      datasets: [
        { label: "Positive", data: positiveData, backgroundColor: "rgba(74, 222, 128, 0.8)" },
        { label: "Negative", data: negativeData, backgroundColor: "rgba(248, 113, 113, 0.8)" },
        { label: "Neutral", data: neutralData, backgroundColor: "rgba(96, 165, 250, 0.8)" },
      ],
    };

    const barOptions = {
      responsive: true,
      plugins: { legend: { labels: { color: "white" } } },
      scales: {
        x: { stacked: true, ticks: { color: "white" }, title: { display: true, text: "Aspects", color: "white" } },
        y: { stacked: true, ticks: { color: "white" }, beginAtZero: true, title: { display: true, text: "Count", color: "white" } },
      },
    };

    const avgScores = aspects.map(a => ({
      aspect: a,
      avgScore: (aspectData[a].totalScore / aspectData[a].count).toFixed(2),
    }));

    const avgScoreData = {
      labels: avgScores.map(a => a.aspect),
      datasets: [{ label: "Avg Sentiment Score", data: avgScores.map(a => a.avgScore), backgroundColor: "rgba(251, 191, 36, 0.8)" }],
    };

    const avgScoreOptions = {
      responsive: true,
      plugins: { legend: { labels: { color: "white" } }, title: { display: true, text: "Average Sentiment Score per Aspect", color: "white" } },
      scales: { x: { ticks: { color: "white" } }, y: { ticks: { color: "white" }, beginAtZero: true } },
    };

    return (
      <div className="aspect-viz-container">
        <h3 className="section-title">Aspect-Based Sentiment Distribution</h3>
        <div className="viz-chart-pane">
          <Bar data={barData} options={barOptions} />
        </div>
        <h4 className="section-title" style={{ marginTop: "1rem" }}>Average Sentiment Scores</h4>
        <div className="viz-chart-pane">
          <Bar data={avgScoreData} options={avgScoreOptions} />
        </div>
      </div>
    );
  };

  // ---------------- JSX ---------------- //
  return (
    <div className="dashboard-main-panel">
      <div className="dashboard-main-grid">
        {/* Upload & Model Selection */}
        <div className="top-row">
          <form className="upload-card" onSubmit={handleSubmit}>
            <h2 className="section-title">Upload Data Set & Model Selection</h2>
            <input type="file" accept=".csv,.txt" onChange={handleFileChange} />
            <select value={model} onChange={e => setModel(e.target.value)}>
              {modelDescriptions.map(item => (
                <option key={item.name} value={item.name}>{item.display}</option>
              ))}
            </select>
            {model === "aspect" && (
              <input type="text" value={aspects} onChange={e => setAspects(e.target.value)} placeholder="Aspects (comma separated)" />
            )}
            {model !== "aspect" && (
              <select value={chartType} onChange={e => setChartType(e.target.value)}>
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="pie">Pie Chart</option>
              </select>
            )}
            <button type="submit" disabled={loading || !file} className="btn-primary" style={{ marginTop: '1rem' }}>
              {loading ? "⏳ Analyzing..." : "🚀 Run Analysis"}
            </button>
          </form>

          {/* Visualization */}
          <div className="visualization-card">
            <h2 className="section-title">Visualizations</h2>
            {result && result.results ? (
              result.model_type === "aspect" ? renderAspectVisualization() : (
                <div>
                  <div className="viz-stat-cards">
                    <div className="viz-stat single-stat positive">
                      <span className="stat-title">Positive</span>
                      <span className="stat-value">{result.summary?.counts?.Positive ?? 0}</span>
                    </div>
                    <div className="viz-stat single-stat negative">
                      <span className="stat-title">Negative</span>
                      <span className="stat-value">{result.summary?.counts?.Negative ?? 0}</span>
                    </div>
                    <div className="viz-stat single-stat neutral">
                      <span className="stat-title">Neutral</span>
                      <span className="stat-value">{result.summary?.counts?.Neutral ?? 0}</span>
                    </div>
                  </div>
                  <div className="viz-charts-area">
                    <div className="viz-chart-pane">{renderChart()}</div>
                    {renderTrend() && <div className="viz-chart-pane">{renderTrend()}</div>}
                  </div>
                </div>
              )
            ) : (
              <p className="text-center text-slate-400">No visualization available yet.</p>
            )}
          </div>
        </div>

        {/* Model Description */}
        <div className="modeldesc-row">
          <div className="modeldesc-card">
            <h2 className="section-title">Model Description</h2>
            <div style={{ background: "#23284d", padding: "1rem", borderRadius: "16px" }}>
              <p style={{ fontSize: "1rem" }}>
                {modelDescriptions.find(desc => desc.name === model)?.description || 'No description available.'}
              </p>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="bottom-row">
          <div className="reviews-data-card">
            <h2 className="section-title">Reviews and Their Scores</h2>
            <div className="reviews-filter-area">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Filter results..." />
              <select value={sentimentFilter} onChange={e => setSentimentFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
            <div>
              {paginatedResults.length === 0 && <p className="text-center text-slate-400">No reviews found.</p>}
              {paginatedResults.map((r, i) => (
                <div
                  key={i}
                  className={`review-item ${r.sentiment === 'Positive' ? 'positive' : r.sentiment === 'Negative' ? 'negative' : 'neutral'}`}
                >
                  <b>Review:</b> {r.review_text || r.review_id || "N/A"}<br />
                  <span><b>Sentiment:</b> {r.sentiment} | <b>Score:</b> {r.score}</span>
                </div>
              ))}
            </div>
            {filteredResults.length > resultsPerPage && (
              <div className="review-pagination-bar">
                <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="btn-secondary-action">
                  Previous
                </button>
                <span style={{ color: '#999' }}>Page {currentPage + 1} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1} className="btn-secondary-action">
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Data Sharing */}
          <div className="data-share-bottom">
            <h3 className="section-title">Data Sharing Options</h3>
            <div className="data-share-btn-list">
              <button onClick={downloadJSON} className="btn-secondary-action">💾 Download JSON</button>
              <button onClick={downloadCSV} className="btn-secondary-action">💾 Download CSV</button>
              <button onClick={copySummary} className="btn-secondary-action">📋 Copy Summary</button>
              <button onClick={exportAll} className="btn-secondary-action">📦 Export ZIP</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
