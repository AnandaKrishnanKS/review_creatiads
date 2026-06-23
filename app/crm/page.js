"use client";

import { useState, useEffect, useCallback } from "react";
import "./crm.css";

export default function CRMDashboard() {
  const [dbMode, setDbMode] = useState("local");
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Authentication states
  const [authRequired, setAuthRequired] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  // Filters and sorting state
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("DESC");

  // Detail View State
  const [activeReviewId, setActiveReviewId] = useState(null);
  const [detailViewActive, setDetailViewActive] = useState(false);
  const [detailStatus, setDetailStatus] = useState("Unseen");
  const [detailNotes, setDetailNotes] = useState("");

  // Debounced search trigger
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Check DB status and auth requirement
  const checkDbStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data = await res.json();
        setDbMode(data.dbMode);
        setAuthRequired(data.authRequired);
        if (!data.authRequired) {
          setIsAuthenticated(true);
        }
      }
    } catch (err) {
      setDbMode("local");
    }
  }, []);

  // Fetch reviews (only if authenticated)
  const loadReviews = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setErrorMsg("");
    const params = new URLSearchParams();
    if (locationFilter) params.append("location", locationFilter);
    if (ratingFilter) params.append("rating", ratingFilter);
    if (statusFilter) params.append("status", statusFilter);
    if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
    params.append("sortBy", sortBy);
    params.append("sortOrder", sortOrder);

    try {
      const res = await fetch(`/api/reviews?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to load reviews from server.");
      }
    } catch (err) {
      console.error("Error loading reviews:", err);
      setErrorMsg("Network error. Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, locationFilter, ratingFilter, statusFilter, debouncedSearch, sortBy, sortOrder]);

  useEffect(() => {
    checkDbStatus();
  }, [checkDbStatus]);

  useEffect(() => {
    if (isAuthenticated) {
      loadReviews();
    }
  }, [isAuthenticated, loadReviews]);

  // Auth login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput })
      });
      const data = await res.json();
      if (res.ok && data.authenticated) {
        setIsAuthenticated(true);
      } else {
        setAuthError(data.error || "Incorrect password");
      }
    } catch (err) {
      setAuthError("Failed to connect to authentication server.");
    }
  };

  // Derived metrics
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : "0.0";
  const readReviewsCount = reviews.filter(r => r.status === 'Read' || r.status === 'Approved').length;
  const unseenReviewsCount = reviews.filter(r => r.status === 'Unseen' || r.status === 'Pending' || r.status === 'Flagged' || !r.status).length;

  // Derived Geographical breakdown
  const getGeoDistribution = () => {
    const counts = {};
    reviews.forEach(r => {
      counts[r.location] = (counts[r.location] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const maxVal = sorted.length > 0 ? sorted[0][1] : 0;
    return { sorted, maxVal };
  };

  const { sorted: geoDist, maxVal: maxGeoVal } = getGeoDistribution();

  // Show review details page
  const handleOpenDetail = (id) => {
    const review = reviews.find(r => r.id === id);
    if (!review) return;
    setActiveReviewId(id);
    setDetailStatus(review.status || "Unseen");
    setDetailNotes(review.client_notes || "");
    setDetailViewActive(true);
  };

  const handleCloseDetail = () => {
    setDetailViewActive(false);
    setActiveReviewId(null);
  };

  // Save changes from moderation detail view
  const handleSaveDetail = async () => {
    if (!activeReviewId) return;
    try {
      const res = await fetch(`/api/reviews/${activeReviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: detailStatus,
          client_notes: detailNotes
        })
      });
      if (res.ok) {
        handleCloseDetail();
        loadReviews();
      } else {
        alert("Failed to save changes.");
      }
    } catch (err) {
      alert("Error saving changes: " + err.message);
    }
  };

  // Delete review
  const handleDeleteReview = async (id, fromDetail = false) => {
    if (!confirm("Are you sure you want to delete this review? This action cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (fromDetail) {
          handleCloseDetail();
        }
        loadReviews();
      } else {
        alert("Failed to delete review.");
      }
    } catch (err) {
      alert("Error deleting review: " + err.message);
    }
  };

  const activeReview = reviews.find(r => r.id === activeReviewId);

  // 1. Authentication Prompt Screen (if required and not authenticated)
  if (authRequired && !isAuthenticated) {
    return (
      <div className="crm-portal-body" style={{ alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0b0f19" }}>
        <div style={{
          width: "100%",
          maxWidth: "420px",
          padding: "40px",
          background: "rgba(17, 24, 39, 0.6)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "20px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
          textAlign: "center"
        }}>
          <div className="logo-container" style={{ margin: "0 auto 24px auto" }}>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M12 2A10 10 0 0 0 2 12a9.9 9.9 0 0 0 2.27 6.36c.07.08.16.14.26.17l.08.02 5.09-1.27a8 8 0 0 1 8.6 0l5.09 1.27.08-.02c.1-.03.19-.09.26-.17A9.9 9.9 0 0 0 22 12 10 10 0 0 0 12 2zm0 15a5 5 0 1 1 5-5 5 5 0 0 1-5 5z" />
            </svg>
          </div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 700, marginBottom: "8px", color: "#fff" }}>
            CRM Access Portal
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "24px" }}>
            Please enter your administrator password to access the reviews dashboard.
          </p>

          {authError && (
            <div style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#fca5a5",
              borderRadius: "10px",
              padding: "10px 14px",
              fontSize: "0.85rem",
              marginBottom: "20px",
              textAlign: "left"
            }}>
              ⚠️ {authError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "20px", textAlign: "left" }}>
              <label htmlFor="password" className="filter-label" style={{ display: "block", marginBottom: "8px" }}>Password</label>
              <input
                type="password"
                id="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="search-input"
                style={{ paddingLeft: "16px" }}
                placeholder="••••••••"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", padding: "12px", fontSize: "1rem", borderRadius: "10px" }}
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Authenticated Dashboard Content
  return (
    <div className={`crm-portal-body ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* Sidebar */}
      <aside className="sidebar" id="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M12 2A10 10 0 0 0 2 12a9.9 9.9 0 0 0 2.27 6.36c.07.08.16.14.26.17l.08.02 5.09-1.27a8 8 0 0 1 8.6 0l5.09 1.27.08-.02c.1-.03.19-.09.26-.17A9.9 9.9 0 0 0 22 12 10 10 0 0 0 12 2zm0 15a5 5 0 1 1 5-5 5 5 0 0 1-5 5z" />
            </svg>
          </div>
          <span className="logo-text" style={{ flexGrow: 1, marginLeft: "12px" }}>CRM</span>
          <button
            id="sidebar-toggle"
            className="sidebar-toggle-btn"
            aria-label="Toggle Sidebar"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="sidebar-scrollable-content">
          <nav>
            <ul className="sidebar-menu">
              <li className="menu-item active">
                <a href="#">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                  </svg>
                  <span className="menu-text">Review Board</span>
                </a>
              </li>
            </ul>
          </nav>

          <div className="sidebar-filters">
            <div className="filter-section-title">Filters</div>
            
            <div className="sidebar-filter-group">
              <label htmlFor="sb-filter-location">Location</label>
              <select
                id="sb-filter-location"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              >
                <option value="">All Locations</option>
                <option value="New York">New York</option>
                <option value="London">London</option>
                <option value="Tokyo">Tokyo</option>
                <option value="Paris">Paris</option>
                <option value="Berlin">Berlin</option>
                <option value="Sydney">Sydney</option>
                <option value="Mumbai">Mumbai</option>
                <option value="San Francisco">San Francisco</option>
              </select>
            </div>

            <div className="sidebar-filter-group">
              <label htmlFor="sb-filter-rating">Rating</label>
              <select
                id="sb-filter-rating"
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
              >
                <option value="">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>

            <div className="sidebar-filter-group">
              <label htmlFor="sb-filter-status">Status</label>
              <select
                id="sb-filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Read">Read</option>
                <option value="Unseen">Unseen</option>
              </select>
            </div>

            <div className="filter-section-title" style={{ marginTop: "12px" }}>Sorting</div>

            <div className="sidebar-filter-group">
              <label htmlFor="sb-sort-by">Sort By</label>
              <select
                id="sb-sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="created_at">Date Created</option>
                <option value="rating">Rating</option>
                <option value="name">Name</option>
                <option value="location">Location</option>
              </select>
            </div>

            <div className="sidebar-filter-group">
              <label htmlFor="sb-sort-order">Order</label>
              <select
                id="sb-sort-order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="DESC">Desc</option>
                <option value="ASC">Asc</option>
              </select>
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-footer-content">
            <p>System Version 1.0.0</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div className="header-title">
            <h1>Reviews Control Center</h1>
            <p>Monitor, moderate, and analyze incoming customer feedback</p>
          </div>

          <div className="header-actions">
            <button
              onClick={() => {
                checkDbStatus();
                loadReviews();
              }}
              className="btn-refresh"
            >
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                className={loading ? "spin-animation" : ""}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
              </svg>
              Refresh Data
            </button>
          </div>
        </header>

        <div className="dashboard-grid">
          {/* Main Dashboard View */}
          <div id="dashboard-main-view" className={detailViewActive ? "hidden" : ""}>
            {/* Metric Row */}
            <section className="metrics-row">
              <div className="metric-card">
                <div className="metric-info">
                  <h3>Total Reviews</h3>
                  <div className="metric-value">{totalReviews}</div>
                </div>
                <div className="metric-icon total">★</div>
              </div>

              <div className="metric-card">
                <div className="metric-info">
                  <h3>Avg Rating</h3>
                  <div className="metric-value">{avgRating}</div>
                </div>
                <div className="metric-icon rating">❤</div>
              </div>

              <div className="metric-card">
                <div className="metric-info">
                  <h3>Read Reviews</h3>
                  <div className="metric-value">{readReviewsCount}</div>
                </div>
                <div className="metric-icon approved">✔</div>
              </div>

              <div className="metric-card">
                <div className="metric-info">
                  <h3>Unseen Reviews</h3>
                  <div className="metric-value">{unseenReviewsCount}</div>
                </div>
                <div className="metric-icon pending">✉</div>
              </div>
            </section>

            {/* Dashboard Layout Grid */}
            <div className="dashboard-layout-grid">
              {/* Table section */}
              <section className="reviews-section">
                <div className="reviews-section-header">
                  <div className="search-wrapper">
                    <span className="search-icon">
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="search-input"
                      placeholder="Search reviews by name or keywords..."
                    />
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="reviews-table">
                    <thead>
                      <tr>
                        <th>Reviewer</th>
                        <th>Location</th>
                        <th>Rating</th>
                        <th>Comment Snippet</th>
                        <th>Status</th>
                        <th style={{ width: "110px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errorMsg && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: "center", color: "var(--danger)", padding: "24px", fontWeight: "500", background: "rgba(239, 68, 68, 0.05)" }}>
                            ⚠️ {errorMsg}
                          </td>
                        </tr>
                      )}
                      {reviews.map((review) => {
                        const dateStr = new Date(review.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        });
                        const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
                        const snippet = review.review_text.length > 55
                          ? review.review_text.substring(0, 52) + "..."
                          : review.review_text;
                        const statusClass = review.status ? review.status.toLowerCase() : "unseen";

                        return (
                          <tr key={review.id}>
                            <td>
                              <div className="reviewer-name">{review.name}</div>
                              <div className="review-date">{dateStr}</div>
                            </td>
                            <td>
                              <span className="location-badge">{review.location}</span>
                            </td>
                            <td>
                              <span className="rating-stars">{stars}</span>
                            </td>
                            <td>
                              <span
                                className="review-snippet"
                                title={review.review_text}
                                style={{
                                  cursor: "pointer",
                                  textDecoration: "underline",
                                  textDecorationStyle: "dotted",
                                }}
                                onClick={() => handleOpenDetail(review.id)}
                              >
                                {snippet}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge ${statusClass}`}>{review.status || "Unseen"}</span>
                            </td>
                            <td>
                              <div className="actions-cell">
                                <button
                                  className="action-btn edit-btn"
                                  title="Moderate / Details"
                                  onClick={() => handleOpenDetail(review.id)}
                                >
                                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                  </svg>
                                </button>
                                <button
                                  className="action-btn delete"
                                  title="Delete Review"
                                  onClick={() => handleDeleteReview(review.id)}
                                >
                                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {reviews.length === 0 && !loading && (
                  <div className="empty-state">
                    <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h3>No Reviews Found</h3>
                    <p>Try adjusting your search filters or wait for customers to submit reviews.</p>
                  </div>
                )}
              </section>

              {/* Geographic distribution breakdown */}
              <section className="chart-container">
                <div className="chart-header">
                  <h3>Geographical Spread</h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>Review distributions by city</p>
                </div>
                <div className="location-list">
                  {geoDist.map(([location, count]) => {
                    const pct = maxGeoVal > 0 ? (count / maxGeoVal) * 100 : 0;
                    return (
                      <div className="location-row" key={location}>
                        <div className="location-name-col">{location}</div>
                        <div className="location-bar-wrapper">
                          <div className="location-bar" style={{ width: `${pct}%` }}></div>
                        </div>
                        <div className="location-count-col">{count}</div>
                      </div>
                    );
                  })}
                  {geoDist.length === 0 && (
                    <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", padding: "20px 0" }}>
                      No location data available.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* Details & Moderation Page View */}
          <div id="dashboard-detail-view" className={!detailViewActive ? "hidden" : ""}>
            <button
              onClick={handleCloseDetail}
              className="btn-refresh"
              style={{ marginBottom: "24px", padding: "8px 16px", background: "rgba(255, 255, 255, 0.05)", fontWeight: "500" }}
            >
              ← Back to Reviews
            </button>

            {activeReview && (
              <div className="dashboard-layout-grid">
                {/* Left Column: Content */}
                <div className="chart-container" style={{ padding: "32px", minHeight: "400px", display: "flex", flexDirection: "column", gap: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "20px" }}>
                    <div>
                      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.8rem", fontWeight: 700, color: "#fff" }}>
                        {activeReview.name}
                      </h2>
                      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "8px" }}>
                        <span className="location-badge">{activeReview.location}</span>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {new Date(activeReview.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="rating-stars" style={{ fontSize: "1.5rem" }}>
                      {"★".repeat(activeReview.rating) + "☆".repeat(5 - activeReview.rating)}
                    </div>
                  </div>

                  <div style={{ flexGrow: 1 }}>
                    <h4 style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
                      Full Review Statement
                    </h4>
                    <div style={{ fontSize: "1.15rem", lineHeight: "1.6", color: "#e5e7eb", padding: "24px", background: "rgba(17, 24, 39, 0.4)", borderRadius: "12px", border: "1px solid var(--border-color)", whiteSpace: "pre-wrap", fontStyle: "italic" }}>
                      {activeReview.review_text}
                    </div>
                  </div>
                </div>

                {/* Right Column: Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div className="chart-container" style={{ padding: "24px" }}>
                    <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", fontWeight: 700, marginBottom: "16px" }}>
                      Moderate Review
                    </h3>

                    <div style={{ marginBottom: "20px" }}>
                      <h4 style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                        Review Status
                      </h4>
                      <select
                        value={detailStatus}
                        onChange={(e) => setDetailStatus(e.target.value)}
                        className="select-input"
                        style={{ width: "100%", background: "rgba(17, 24, 39, 0.5)" }}
                      >
                        <option value="Unseen">Unseen</option>
                        <option value="Read">Read</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                      <h4 style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                        Internal CRM Notes
                      </h4>
                      <textarea
                        value={detailNotes}
                        onChange={(e) => setDetailNotes(e.target.value)}
                        className="notes-textarea"
                        style={{ minHeight: "120px" }}
                        placeholder="Write internal notes about client correspondence, actions taken, etc."
                      ></textarea>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveDetail}
                      className="btn btn-primary"
                      style={{ width: "100%", padding: "12px" }}
                    >
                      Save Moderate Changes
                    </button>
                  </div>

                  <div className="chart-container" style={{ padding: "20px", borderColor: "rgba(239, 68, 68, 0.2)" }}>
                    <h4 style={{ fontSize: "0.75rem", color: "var(--danger)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                      Danger Zone
                    </h4>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "12px" }}>
                      Permanently delete this review from the database.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDeleteReview(activeReview.id, true)}
                      className="btn btn-secondary"
                      style={{ width: "100%", borderColor: "rgba(239, 68, 68, 0.4)", color: "var(--danger)", padding: "10px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--border-color)", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontFamily: "var(--font-heading)" }}
                    >
                      Delete Review
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
