import { useState, useEffect } from "react";
import AnalyticsCharts from "./components/AnalyticsCharts";

function App() {
  const API = import.meta.env.VITE_API_URL;

  const [url, setUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [urls, setUrls] = useState([]);
  const [customAlias, setCustomAlias] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Helper to trigger custom Toast notifications
  const addToast = (message, type = "success") => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // 🔥 Fetch all URLs
  const fetchUrls = async () => {
    try {
      const res = await fetch(`${API}/urls`);
      if (!res.ok) throw new Error("Failed to fetch URLs");
      const data = await res.json();
      setUrls(data);
    } catch (err) {
      console.error("Error fetching URLs:", err);
      addToast("Failed to fetch URLs from the server", "error");
    }
  };

  useEffect(() => {
    fetchUrls();
  }, []);

  // 🔗 Shorten URL
  const handleShorten = async () => {
    if (!url) {
      addToast("Please enter a URL first", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/shorten`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          customAlias: customAlias || undefined,
          expiresAt: expiresAt || undefined,
        }),
      });

      const data = await res.json();

      if (data.error) {
        addToast(data.error, "error");
        return;
      }

      setShortUrl(data.shortUrl);
      setUrl("");
      setCustomAlias("");
      setExpiresAt("");
      addToast("Short link generated successfully!", "success");
      fetchUrls();
    } catch (err) {
      console.error("Error shortening URL:", err);
      addToast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Helper to calculate expiration status
  const getExpirationStatus = (expiresAtString) => {
    if (!expiresAtString) {
      return { label: "Permanent", className: "badge-permanent" };
    }
    const expiry = new Date(expiresAtString);
    const expired = new Date() > expiry;
    return {
      label: expired ? "Expired" : "Active",
      className: expired ? "badge-expired" : "badge-active",
      formattedDate: expiry.toLocaleDateString(),
      formattedTime: expiry.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fullString: expiry.toLocaleString()
    };
  };

  // 📊 Analytics
  const getAnalyticsFromCode = async (code) => {
    try {
      const res = await fetch(`${API}/analytics/${code}`);
      if (!res.ok) throw new Error("Failed to get analytics");
      const data = await res.json();
      setAnalytics(data);
      addToast(`Analytics loaded for code: ${code}`, "info");
    } catch (err) {
      console.error("Error fetching analytics:", err);
      addToast("Failed to fetch analytics", "error");
    }
  };

  // ❌ Delete URL
  const deleteUrl = async (code) => {
    if (!window.confirm(`Are you sure you want to delete /${code}?`)) return;

    try {
      const res = await fetch(`${API}/delete/${code}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Deletion failed");

      addToast("URL deleted successfully!", "success");
      fetchUrls();
      
      // If we deleted the URL that is currently in the analytics view, clear it
      if (analytics && analytics.shortCode === code) {
        setAnalytics(null);
      }
    } catch (err) {
      console.error("Error deleting URL:", err);
      addToast("Failed to delete URL", "error");
    }
  };

  // 📋 Copy link
  const copyToClipboard = (code) => {
    const fullUrl = `${API}/${code}`;
    navigator.clipboard.writeText(fullUrl)
      .then(() => {
        addToast("Copied to clipboard!", "success");
      })
      .catch((err) => {
        console.error("Clipboard copy failed:", err);
        addToast("Failed to copy link", "error");
      });
  };

  // ⏸️ Toggle Active Status
  const handleToggleActive = async (code) => {
    try {
      const res = await fetch(`${API}/toggle-active/${code}`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (data.error) {
        addToast(data.error, "error");
        return;
      }
      
      addToast(data.message, "success");
      setUrls((prev) =>
        prev.map((item) =>
          item.short_code === code ? { ...item, is_active: data.is_active } : item
        )
      );

      // If analytics is currently loaded for this link, refresh it
      if (analytics && analytics.shortCode === code) {
        getAnalyticsFromCode(code);
      }
    } catch (err) {
      console.error("Error toggling link status:", err);
      addToast("Failed to toggle link status", "error");
    }
  };

  return (
    <>
      {/* Glow background blobs */}
      <div className="glow-bg">
        <div className="glow-blob glow-blob-1"></div>
        <div className="glow-blob glow-blob-2"></div>
        <div className="glow-blob glow-blob-3"></div>
      </div>

      <div className="app-container">
        {/* Header */}
        <header>
          <h1>🔗 SleekLink</h1>
          <p className="subtitle">Premium URL Shortener Dashboard</p>
        </header>

        {/* Input Card */}
        <section className="glass-card">
          <h2>Create Short Link</h2>
          <div className="form-container">
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Enter URL to shorten (e.g. github.com/google)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Custom alias (optional, e.g. custom-name)"
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="input-wrapper" style={{ textAlign: "left" }}>
              <label 
                style={{ 
                  display: "block", 
                  fontSize: "0.85rem", 
                  color: "var(--text-secondary)", 
                  marginBottom: "6px",
                  fontWeight: "500"
                }}
              >
                Expiration Date & Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="input-field"
                style={{ colorScheme: "dark" }}
              />
            </div>

            <button onClick={handleShorten} className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <svg className="spinner" viewBox="0 0 50 50">
                    <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                  </svg>
                  Shortening...
                </>
              ) : (
                "Shorten URL"
              )}
            </button>

            {shortUrl && (
              <div 
                style={{ 
                  marginTop: "16px", 
                  padding: "12px 16px", 
                  borderRadius: "10px", 
                  background: "rgba(99, 102, 241, 0.1)", 
                  border: "1px solid rgba(99, 102, 241, 0.2)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Short URL: </span>
                  <a
                    href={shortUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="url-link"
                  >
                    {shortUrl}
                  </a>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(shortUrl);
                    addToast("Copied short link!", "success");
                  }}
                  className="btn-action btn-copy"
                  style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Analytics Details Panel */}
        {analytics && (
          <section className="glass-card" style={{ animation: "fadeIn 0.5s ease-out" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2>📊 Analytics Dashboard</h2>
              <button 
                onClick={() => setAnalytics(null)} 
                className="btn-action" 
                style={{ 
                  background: "rgba(255,255,255,0.05)", 
                  color: "var(--text-secondary)", 
                  border: "1px solid rgba(255,255,255,0.1)",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  transition: "all 0.2s"
                }}
              >
                ✕ Close Panel
              </button>
            </div>
            
            <div className="analytics-grid">
              <div className="stat-card">
                <div className="stat-label">Short Code</div>
                <div className="stat-value" style={{ color: "var(--primary-light)", letterSpacing: "0.5px" }}>
                  /{analytics.shortCode}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Clicks</div>
                <div className="stat-value" style={{ color: "#34d399" }}>{analytics.totalClicks}</div>
              </div>
            </div>

            {/* Custom SVG & Distribution Charts */}
            <AnalyticsCharts data={analytics} />
          </section>
        )}

        {/* All Links List */}
        <section className="glass-card">
          <h2>📋 Shortened Links Registry</h2>

          {urls.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔗</div>
              <p>No shortened links found. Create your first link above!</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Short URL</th>
                    <th>Original Destination</th>
                    <th>Status</th>
                    <th>Active</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {urls.map((item) => {
                    const status = getExpirationStatus(item.expires_at);
                    return (
                      <tr key={item.short_code}>
                        <td data-label="Code">
                          <span className="code-badge">{item.short_code}</span>
                        </td>

                        <td data-label="Short URL">
                          <a
                            href={`${API}/${item.short_code}`}
                            target="_blank"
                            rel="noreferrer"
                            className="url-link"
                          >
                            {`${API}/${item.short_code}`}
                          </a>
                        </td>

                        <td data-label="Original Destination">
                          <a 
                            href={item.original_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="url-truncated" 
                            title={item.original_url}
                            style={{ textDecoration: "none" }}
                          >
                            {item.original_url}
                          </a>
                        </td>

                        <td data-label="Status">
                          <span className={`badge ${status.className}`}>
                            {status.label}
                          </span>
                          {status.formattedDate && (
                            <span 
                              className="expires-text" 
                              title={`Expires on ${status.fullString}`}
                            >
                              {status.formattedDate} {status.formattedTime}
                            </span>
                          )}
                        </td>

                        <td data-label="Active">
                          <label className="toggle-switch">
                            <input 
                              type="checkbox" 
                              checked={item.is_active !== false}
                              onChange={() => handleToggleActive(item.short_code)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </td>

                        <td data-label="Actions" style={{ textAlign: "right" }}>
                          <div className="action-group">
                            <button
                              onClick={() => getAnalyticsFromCode(item.short_code)}
                              className="btn-action btn-analytics"
                            >
                              Analytics
                            </button>

                            <button
                              onClick={() => copyToClipboard(item.short_code)}
                              className="btn-action btn-copy"
                            >
                              Copy
                            </button>

                            <button
                              onClick={() => deleteUrl(item.short_code)}
                              className="btn-action btn-delete"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Floating Toast Notification Containers */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span className="toast-icon">
              {toast.type === "success" && "✓"}
              {toast.type === "error" && "✗"}
              {toast.type === "info" && "ℹ"}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default App;
