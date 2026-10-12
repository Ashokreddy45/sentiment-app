import API_BASE_URL from "../api";
// src/components/History.jsx
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import axios from "axios";

const History = () => {
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredHistory, setFilteredHistory] = useState([]);

  // Fetch history from backend
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const params = {};
        if (searchTerm) params.search = searchTerm;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        const response = await axios.get(`${API_BASE_URL}/history`, {
          params,
        });
        setHistory(response.data.history);
      } catch (error) {
        console.error("Failed to fetch history:", error);
      }
    };

    fetchHistory();
  }, [searchTerm, startDate, endDate]); // re-fetch when filters change

  useEffect(() => {
    setFilteredHistory(history);
  }, [history]);

  return (
    <div className="p-8 w-full">
      <h2 className="text-3xl font-bold text-indigo-400 mb-6">
        Analysis History
      </h2>

      {/* Search & Filter Section */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Search reviews..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 w-full sm:w-1/3"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100"
        />
        <button
          onClick={() => {
            setSearchTerm("");
            setStartDate("");
            setEndDate("");
          }}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
        >
          Clear Filters
        </button>
      </div>

      {/* History Table */}
      <div className="overflow-x-auto bg-slate-800 p-6 rounded-lg shadow-xl">
        {filteredHistory.length === 0 ? (
          <p className="text-slate-400">No records found.</p>
        ) : (
          <table className="w-full text-left text-slate-100">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="py-2 px-4">Date</th>
                <th className="py-2 px-4">Review</th>
                <th className="py-2 px-4">Sentiment</th>
                <th className="py-2 px-4">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item) => (
                <tr key={item.id} className="border-b border-slate-700">
                  <td className="py-2 px-4">
                    {format(new Date(item.date), "yyyy-MM-dd")}
                  </td>
                  <td className="py-2 px-4">{item.review_text}</td>
                  <td
                    className={`py-2 px-4 ${
                      item.sentiment === "Positive"
                        ? "text-green-400"
                        : item.sentiment === "Negative"
                        ? "text-red-400"
                        : "text-yellow-400"
                    }`}
                  >
                    {item.sentiment}
                  </td>
                  <td className="py-2 px-4">{item.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default History;
