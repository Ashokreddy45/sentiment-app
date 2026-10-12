// src/components/AutoReply.jsx
import React, { useState } from 'react';

const AutoReply = () => {
  const [reviewText, setReviewText] = useState('');
  const [replyText, setReplyText] = useState('');

  const generateReply = () => {
    // This logic would connect to a backend API endpoint
    // that uses a generative AI model (e.g., GPT-3, Llama)
    // to create a response based on the sentiment of the review.
    
    // Placeholder logic:
    const sentiment = Math.random() > 0.5 ? 'positive' : 'negative';
    let generatedReply = '';

    if (sentiment === 'positive') {
      generatedReply = "We're so happy to hear that! Thank you for your kind words and for being a valued customer. 😊";
    } else {
      generatedReply = "We're sorry to hear about your experience. Please contact our support team so we can address your concerns immediately. Your feedback is important to us. 🙏";
    }
    setReplyText(generatedReply);
  };

  return (
    <div className="p-8 w-full">
      <h2 className="text-3xl font-bold text-indigo-400 mb-6">AI Auto-Reply</h2>
      <div className="bg-slate-800 p-6 rounded-lg shadow-xl space-y-6">
        <p className="text-slate-400">
          Enter a customer review below and our AI will generate an appropriate reply based on its sentiment.
        </p>
        <div>
          <label htmlFor="review-input" className="block text-sm font-semibold text-gray-300 mb-2">Customer Review</label>
          <textarea
            id="review-input"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={4}
            className="w-full p-3 rounded-lg bg-slate-700 text-white border border-transparent focus:border-indigo-500 focus:outline-none"
            placeholder="Type a review here..."
          />
        </div>
        <button
          onClick={generateReply}
          className="btn-primary"
        >
          Generate Reply
        </button>
        {replyText && (
          <div className="mt-6">
            <h3 className="text-xl font-bold text-teal-400 mb-2">Generated Reply:</h3>
            <p className="p-4 bg-slate-700 rounded-lg text-white whitespace-pre-wrap">{replyText}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoReply;