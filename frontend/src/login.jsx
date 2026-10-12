import API_BASE_URL from "./api";
import React, { useState } from "react";
import "./Login.css";

export default function Login({ goToRegister, goToForgot, onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Example login API call — replace with your backend endpoint
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        onLoginSuccess(data);
      } else {
        setError(data.message || "Login failed");
      }
    } catch {
      setError("Server error. Please try again later.");
    }
  };

  return (
    <div className="login-page">
      {/* Floating Particles */}
      {[...Array(15)].map((_, i) => (
        <span
          key={i}
          className="particle"
          style={{
            width: `${Math.random() * 8 + 4}px`,
            height: `${Math.random() * 8 + 4}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 10}s`,
          }}
        />
      ))}

      {/* Login Card */}
      <div className="login-card">
        <h1 className="login-title">Welcome Back</h1>
        <p className="login-subtitle">Sign in to continue to your dashboard</p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p style={{ color: "red", fontSize: "0.9rem" }}>{error}</p>}

          <button type="submit" className="login-btn">
            Login
          </button>
        </form>

        <div className="auth-links">
          <button className="link-btn" onClick={goToForgot}>
            Forgot Password?
          </button>
          <button className="link-btn" onClick={goToRegister}>
            Create an Account
          </button>
        </div>
      </div>
    </div>
  );
}
