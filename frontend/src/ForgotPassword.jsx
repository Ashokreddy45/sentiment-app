import API_BASE_URL from "./api";
import React, { useState } from "react";
import "./Login.css";

export default function ForgotPassword({ goToLogin }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || "Password reset email sent!");
      } else {
        setMessage(data.detail || "Request failed");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error connecting to server");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Forgot Password</h1>
        <p className="login-subtitle">Enter your email to reset password</p>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button type="submit" className="login-btn">Send Reset Link</button>
        </form>
        <p style={{ color: "red", marginTop: "10px" }}>{message}</p>
        <div className="auth-links">
          <button onClick={goToLogin} className="link-btn">Back to Login</button>
        </div>
      </div>
    </div>
  );
}
