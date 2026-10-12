import React, { useState } from "react";
import "./index.css";
import "./App.css";
import "./login.css";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import History from "./components/History";
import AutoReply from "./components/AutoReply";
import Manual from "./components/Manual";
import Login from "./login";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";

export default function App() {
  // ======================
  // State Variables
  // ======================
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [theme, setTheme] = useState("dark");
  const [vibrantMain, setVibrantMain] = useState("#8b5cf6");
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("userLoggedIn"));
  const [authPage, setAuthPage] = useState("login");

  // ======================
  // Handlers
  // ======================
  const handleLoginSuccess = (token) => {
    localStorage.setItem("userLoggedIn", "true");
    localStorage.setItem("authToken", token || "dummy-token");
    setLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("userLoggedIn");
    localStorage.removeItem("authToken");
    setLoggedIn(false);
    setAuthPage("login"); // reset to login page
  };

  // ======================
  // Before Login Pages
  // ======================
  if (!loggedIn) {
    if (authPage === "login")
      return (
        <Login
          onLoginSuccess={handleLoginSuccess}
          goToRegister={() => setAuthPage("register")}
          goToForgot={() => setAuthPage("forgot")}
        />
      );

    if (authPage === "register")
      return <Register goToLogin={() => setAuthPage("login")} />;

    if (authPage === "forgot")
      return <ForgotPassword goToLogin={() => setAuthPage("login")} />;
  }

  // ======================
  // After Login Pages
  // ======================
  return (
    <div className="app-main-layout">
      {/* Sidebar with Logout */}
      <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        theme={theme}
        setTheme={setTheme}
        vibrantMain={vibrantMain}
        setVibrantMain={setVibrantMain}
        onLogout={handleLogout} // ✅ pass logout function
      />

      <div className="dashboard-panel">
        {/* Page Header */}
        <h1
          style={{
            color: "#fff",
            fontWeight: 700,
            marginBottom: "2.5rem",
          }}
        >
          {activeMenu === "dashboard"
            ? "📊 AI Sentiment Dashboard"
            : activeMenu.charAt(0).toUpperCase() + activeMenu.slice(1) + " Tool"}
        </h1>

        {/* Render Pages Based on Active Menu */}
        {activeMenu === "dashboard" && <Dashboard />}
        {activeMenu === "manual" && <Manual />}
        {activeMenu === "history" && <History />}
        {activeMenu === "autoreply" && <AutoReply />}
        {activeMenu === "profile" && (
          <div style={{ padding: "2rem", width: "100%", maxWidth: "600px" }}>
            <h2
              style={{
                color: "#60a5fa",
                fontWeight: "bold",
                marginBottom: "1rem",
              }}
            >
              Account & Profile
            </h2>
            <div className="dashboard-section">
              <p>Placeholder for account settings.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
