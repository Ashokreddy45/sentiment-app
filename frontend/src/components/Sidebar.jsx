import React, { useEffect } from "react";

const Sidebar = ({
  activeMenu,
  setActiveMenu,
  theme,
  setTheme,
  vibrantMain,
  setVibrantMain,
  onLogout, // ✅ new prop
}) => {
  const themeOptions = [
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
    { value: "vibrant", label: "Vibrant" },
  ];

  const vibrantColors = [
    { value: "#8b5cf6", label: "Violet" },
    { value: "#38bdf8", label: "Sky Blue" },
    { value: "#ef4444", label: "Red" },
    { value: "#22d3ee", label: "Cyan" },
    { value: "#f59e42", label: "Orange" },
    { value: "#10b981", label: "Green" },
  ];

  const sidebarMenu = [
    { key: "dashboard", label: "Dashboard" },
    { key: "manual", label: "Manual Analysis" },
    { key: "history", label: "Analysis History" },
    { key: "autoreply", label: "Auto Reply" },
    { key: "profile", label: "Profile & Account" },
  ];

  // Apply theme & vibrant color to root
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    if (theme === "vibrant") root.style.setProperty("--vibrant-main", vibrantMain);
  }, [theme, vibrantMain]);

  return (
    <aside className="sidebar-container">
      <div className="sidebar-logo">SA Dashboard</div>

      <ul className="sidebar-menu-list">
        {sidebarMenu.map((menu) => (
          <li
            key={menu.key}
            className={`sidebar-menu-item ${activeMenu === menu.key ? "active" : ""}`}
            onClick={() => setActiveMenu(menu.key)}
          >
            {menu.label}
          </li>
        ))}
      </ul>

      <div className="sidebar-theme-switch">
        <label>Theme:</label>
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          {themeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {theme === "vibrant" && (
          <>
            <label>Select Color:</label>
            <select value={vibrantMain} onChange={(e) => setVibrantMain(e.target.value)}>
              {vibrantColors.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* ✅ Logout Button */}
      <div className="sidebar-logout">
        <button
          className="logout-btn"
          onClick={onLogout}
          style={{
            width: "100%",
            marginTop: "1.5rem",
            padding: "0.6rem 0",
            background: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontWeight: "600",
            transition: "background 0.3s ease",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#dc2626")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#ef4444")}
        >
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
