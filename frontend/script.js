// script.js
// Frontend: upload CSV, send to backend for analysis, render charts with Chart.js

let sentimentChart = null;
let topicsChart = null;
let processedRows = []; // array of {text, score, sentiment}
let currentResponse = null; // raw backend response for reuse

// Utility: escape HTML
function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"'`=\/]/g, function (c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[c];
  });
}

// Update visuals using backend response
function updateAllVisualsFromResponse(resp) {
  if (!resp) return;
  currentResponse = resp;

  // Build rows if detailed
  if (resp.results && resp.results.length) {
    processedRows = resp.results.slice(); // copy
  } else {
    // if not detailed, create simple representation using counts and buckets
    const s = resp.summary || {};
    processedRows = [];
    const counts = s.counts || {Positive:0, Negative:0, Neutral:0};
    // build small array for table
    Object.entries(counts).forEach(([label, cnt]) => {
      for (let i=0;i<Math.min(cnt, 200);i++) {
        processedRows.push({ text: `${label} (sample)`, score: 0, sentiment: label });
      }
    });
  }

  // Update quick summary
  const summary = resp.summary || { total: processedRows.length, counts: {Positive:0,Negative:0,Neutral:0}, average_score:0 };
  document.getElementById('positiveCount').textContent = summary.counts.Positive || 0;
  document.getElementById('negativeCount').textContent = summary.counts.Negative || 0;
  document.getElementById('neutralCount').textContent = summary.counts.Neutral || 0;
  const positivePct = summary.positive_pct || 0;
  const negativePct = summary.negative_pct || 0;
  const percentage = Math.round((positivePct - negativePct));
  document.getElementById('gaugeValue').textContent = `${percentage}%`;
  const rotation = (percentage / 100) * 90;
  const gaugeFill = document.getElementById('gaugeFill');
  gaugeFill.style.transform = `rotate(${45 + rotation}deg)`;
  let status = 'Neutral', color = '#d4d4d4';
  if (percentage > 10) { status = 'Positive'; color = '#4ade80'; }
  else if (percentage < -10) { status = 'Negative'; color = '#f87171'; }
  document.getElementById('gaugeLabel').textContent = status;
  document.getElementById('gaugeLabel').style.color = color;
  gaugeFill.style.backgroundColor = color;

  // Trend / buckets
  const buckets = resp.buckets || [];
  const labels = buckets.map((b,i) => `B${i+1}`);
  const posData = buckets.map(b => b.Positive || 0);
  const negData = buckets.map(b => b.Negative || 0);
  const neuData = buckets.map(b => b.Neutral || 0);

  // Chart type selection (line/bar/pie)
  const vizType = (resp.viz_type || document.getElementById('vizType').value || 'bar');

  // create/update sentimentChart
  if (!sentimentChart) {
    const ctx = document.getElementById('sentimentChart').getContext('2d');
    sentimentChart = new Chart(ctx, {
      type: vizType === 'pie' ? 'pie' : (vizType === 'bar' ? 'bar' : 'line'),
      data: {
        labels: labels,
        datasets: vizType === 'pie' ? [
          { label: 'Positive', data: [summary.counts.Positive], backgroundColor: ['rgb(74, 222, 128)'] },
          { label: 'Negative', data: [summary.counts.Negative], backgroundColor: ['rgb(248, 113, 113)'] },
          { label: 'Neutral', data: [summary.counts.Neutral], backgroundColor: ['rgb(156, 163, 175)'] },
        ] : [
          { label: 'Positive', data: posData, borderColor: 'rgb(74, 222, 128)', tension: 0.3, fill: true, backgroundColor: 'rgba(74, 222, 128, 0.15)' },
          { label: 'Negative', data: negData, borderColor: 'rgb(248, 113, 113)', tension: 0.3, fill: true, backgroundColor: 'rgba(248, 113, 113, 0.12)' },
          { label: 'Neutral', data: neuData, borderColor: 'rgb(156, 163, 175)', tension: 0.3, fill: true, backgroundColor: 'rgba(156, 163, 175, 0.12)' }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#cbd5e1' } } },
        scales: vizType === 'pie' ? {} : { x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.03)' } }, y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.03)' } } }
      }
    });
  } else {
    // change type if needed: Chart.js doesn't support changing type directly; recreate
    const currentType = sentimentChart.config.type;
    const targetType = vizType === 'pie' ? 'pie' : (vizType === 'bar' ? 'bar' : 'line');
    if (currentType !== targetType) {
      sentimentChart.destroy();
      sentimentChart = null;
      updateAllVisualsFromResponse(resp);
      return;
    } else {
      if (vizType === 'pie') {
        sentimentChart.data = {
          labels: ['Positive','Negative','Neutral'],
          datasets: [
            { data: [summary.counts.Positive, summary.counts.Negative, summary.counts.Neutral], backgroundColor: ['rgb(74, 222, 128)','rgb(248, 113, 113)','rgb(156, 163, 175)'] }
          ]
        };
      } else {
        sentimentChart.data.labels = labels;
        sentimentChart.data.datasets[0].data = posData;
        sentimentChart.data.datasets[1].data = negData;
        sentimentChart.data.datasets[2].data = neuData;
      }
      sentimentChart.update();
    }
  }

  // Topics: compute top tokens from processedRows
  const topics = extractTopTopics(processedRows, 6);
  const tlabels = topics.map(t => t.token);
  const tpos = topics.map(t => t.pos);
  const tneg = topics.map(t => t.neg);
  const tneu = topics.map(t => t.neu);

  if (!topicsChart) {
    const ctx2 = document.getElementById('topicsChart').getContext('2d');
    topicsChart = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: tlabels,
        datasets: [
          { label: 'Positive', data: tpos, backgroundColor: 'rgb(74, 222, 128)' },
          { label: 'Negative', data: tneg, backgroundColor: 'rgb(248, 113, 113)' },
          { label: 'Neutral', data: tneu, backgroundColor: 'rgb(156, 163, 175)' }
        ]
      },
      options: {
        responsive: true,
        scales: { x: { ticks: { color: '#94a3b8' }, stacked: true }, y: { ticks: { color: '#94a3b8' }, stacked: true } },
        plugins: { legend: { labels: { color: '#cbd5e1' } } }
      }
    });
  } else {
    topicsChart.data.labels = tlabels;
    topicsChart.data.datasets[0].data = tpos;
    topicsChart.data.datasets[1].data = tneg;
    topicsChart.data.datasets[2].data = tneu;
    topicsChart.update();
  }

  // Results table - show up to 200 rows
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';
  const maxShow = Math.min(processedRows.length, 200);
  const table = document.createElement('table');
  table.className = 'min-w-full text-sm';
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr class="text-left"><th class="px-2 py-1">Text</th><th class="px-2 py-1">Sentiment</th><th class="px-2 py-1">Score</th></tr>`;
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  for (let i = 0; i < maxShow; i++) {
    const r = processedRows[i];
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="px-2 py-1">${escapeHtml(r.text)}</td>
                    <td class="px-2 py-1">${r.sentiment}</td>
                    <td class="px-2 py-1">${(r.score || 0).toFixed ? r.score.toFixed(3) : r.score}</td>`;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  resultsDiv.appendChild(table);
}

// Extract top topics: simple token counting (excluding small stopwords)
const stopwords = new Set([
  "the","and","is","in","at","which","on","a","an","it","this","that","to","for","of","was","were","are","be","with","as","by","from","they","we","you","i","not","have","has"
]);

function extractTopTopics(rows, topN = 6) {
  const map = {};
  for (const r of rows) {
    const normalized = r.text.toLowerCase().replace(/[^\w\s]/g, ' ');
    const tokens = normalized.split(/\s+/).filter(t => t.length > 2 && !stopwords.has(t));
    const seen = new Set();
    for (const t of tokens) {
      if (seen.has(t)) continue;
      seen.add(t);
      if (!map[t]) map[t] = { pos:0, neg:0, neu:0, total:0 };
      const label = r.sentiment;
      if (label === 'Positive') map[t].pos++;
      else if (label === 'Negative') map[t].neg++;
      else map[t].neu++;
      map[t].total++;
    }
  }
  const arr = Object.entries(map).map(([token, counts]) => ({ token, ...counts }));
  arr.sort((a,b) => b.total - a.total);
  return arr.slice(0, topN);
}

// Send CSV to backend for processing
async function processCSVWithBackend(file, modelType, outputType, vizType) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("model_type", modelType);
  formData.append("output_type", outputType);
  formData.append("viz_type", vizType);

  try {
    const res = await fetch("http://127.0.0.1:8000/analyze", {

      method: "POST",
      body: formData
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return null;
    }
    return data;
  } catch (err) {
    alert("Failed to reach backend. Make sure backend is running at http://127.0.0.1:8000");
    console.error(err);
    return null;
  }
}

// Event handlers
document.addEventListener('DOMContentLoaded', () => {
  // CSS upload
  const cssUpload = document.getElementById('cssUpload');
  cssUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById('custom-styles').textContent = ev.target.result;
    };
    reader.readAsText(file);
  });

  // Apply filters (parse CSV and call backend)
  document.getElementById('applyFilters').addEventListener('click', async () => {
    const dataFile = document.getElementById('dataUpload').files[0];
    const dataSource = document.getElementById('dataSource') ? document.getElementById('dataSource').value : 'uploaded';
    const modelType = document.getElementById('modelSelect').value;
    const outputType = document.getElementById('outputType').value;
    const vizType = document.getElementById('vizType').value;

    if (!dataFile) {
      alert("Please upload a CSV file first.");
      return;
    }

    // show loading UI briefly
    document.getElementById('applyFilters').textContent = "Processing...";
    document.getElementById('applyFilters').disabled = true;

    const resp = await processCSVWithBackend(dataFile, modelType, outputType, vizType);

    document.getElementById('applyFilters').textContent = "Apply";
    document.getElementById('applyFilters').disabled = false;

    if (!resp) return;
    // show main areas
    document.getElementById('main-content-area').classList.remove('hidden');
    document.getElementById('quick-insights-card').classList.remove('hidden');

    updateAllVisualsFromResponse(resp);
  });

  // Export button - downloads processedRows as CSV (from backend results if available)
  document.getElementById('exportBtn').addEventListener('click', () => {
    const resp = currentResponse;
    if (!resp) {
      alert("No results to export. Run analysis first.");
      return;
    }

    // If detailed results present, export them; otherwise export summary
    let header = "text,score,sentiment\n";
    let lines = [];
    if (resp.results && resp.results.length) {
      lines = resp.results.map(r => `"${(r.text || "").replace(/"/g,'""')}",${r.score},"${r.sentiment}"`);
    } else {
      const s = resp.summary || {};
      lines = [
        `"Total",${s.total || 0},""`,
        `"Positive",${s.counts?.Positive || 0},""`,
        `"Neutral",${s.counts?.Neutral || 0},""`,
        `"Negative",${s.counts?.Negative || 0},""`
      ];
    }
    const csv = header + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "sentiment_results.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  document.getElementById('refreshTopics').addEventListener('click', () => {
    if (currentResponse) updateAllVisualsFromResponse(currentResponse);
  });

  document.getElementById('drillDownBtn').addEventListener('click', () => {
    alert("Drill-down placeholder. Click a chart segment to implement a drill-down in code.");
  });

  // Optional: allow pressing Enter in globalSearch to filter table client-side
  const gs = document.getElementById('globalSearch');
  gs.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = gs.value.trim().toLowerCase();
      if (!q) {
        // restore
        if (currentResponse) updateAllVisualsFromResponse(currentResponse);
        return;
      }
      const filtered = (processedRows || []).filter(r => r.text.toLowerCase().includes(q));
      updateAllVisualsFromResponse({ ...currentResponse, results: filtered, summary: {
        total: filtered.length,
        counts: filtered.reduce((acc,cur) => { acc[cur.sentiment] = (acc[cur.sentiment]||0)+1; return acc; }, {Positive:0,Negative:0,Neutral:0}),
        positive_pct: 0, negative_pct: 0, neutral_pct:0, average_score:0
      }, buckets: currentResponse ? currentResponse.buckets : []});
    }
  });
});
