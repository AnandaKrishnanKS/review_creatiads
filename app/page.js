"use client";

import { useState } from "react";
import "./customer.css";

export default function CustomerFeedbackPortal() {
  const [view, setView] = useState("form"); // 'form' | 'success' | 'exit'
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rotateDeg, setRotateDeg] = useState(0);

  const handleStarClick = (val) => {
    setRating(val);
  };

  const handleStarMouseEnter = (val) => {
    setHoverRating(val);
  };

  const handleStarMouseLeave = () => {
    setHoverRating(0);
  };

  const handleTextChange = (e) => {
    setReviewText(e.target.value.substring(0, 1000));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (!location) {
      setErrorMsg("Please select your location.");
      return;
    }
    if (rating === 0) {
      setErrorMsg("Please select a rating by clicking on the stars.");
      return;
    }
    if (!reviewText.trim()) {
      setErrorMsg("Please write your review details.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          location,
          rating,
          review_text: reviewText.trim(),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setRotateDeg(360);
        setTimeout(() => {
          setView("success");
        }, 150);

        setName("");
        setLocation("");
        setRating(0);
        setReviewText("");
      } else {
        setErrorMsg(result.error || "Failed to submit review.");
      }
    } catch (err) {
      setErrorMsg("Network error. Unable to connect to the server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewReview = () => {
    setRotateDeg(0);
    setView("form");
  };

  const handleDoneExit = () => {
    setRotateDeg(720);
    setTimeout(() => {
      setView("exit");
    }, 150);
  };

  return (
    <div className="customer-portal-body">
      <div className="container">
        <div className="card" style={{ transform: `rotateY(${rotateDeg}deg)` }}>
          {view === "form" && (
            <div id="form-view">
              <div className="card-header">
                <div className="brand-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 2A10 10 0 0 0 2 12a9.9 9.9 0 0 0 2.27 6.36c.07.08.16.14.26.17l.08.02 5.09-1.27a8 8 0 0 1 8.6 0l5.09 1.27.08-.02c.1-.03.19-.09.26-.17A9.9 9.9 0 0 0 22 12 10 10 0 0 0 12 2zm1 14h-2v-2h2zm0-4h-2V7h2z" />
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </div>
                <h1 className="card-title">Share Your Experience</h1>
                <p className="card-subtitle">Your feedback helps us grow. Please fill out the form below.</p>
              </div>

              {errorMsg && (
                <div className="error-message" style={{ display: "flex" }}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* Name Input */}
                <div className="form-group">
                  <label htmlFor="name" className="form-label">Full Name</label>
                  <div className="input-container">
                    <span className="input-icon">
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </span>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="form-input"
                      placeholder="Enter your name"
                      required
                      maxLength={100}
                      autoComplete="off"
                    />
                  </div>
                </div>

                {/* Location Dropdown */}
                <div className="form-group">
                  <label htmlFor="location" className="form-label">Your Location</label>
                  <div className="input-container">
                    <span className="input-icon">
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                    </span>
                    <select
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="form-select"
                      required
                    >
                      <option value="" disabled>Select your city...</option>
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
                </div>

                {/* Star Rating Selector */}
                <div className="form-group">
                  <label className="form-label">Overall Rating</label>
                  <div className="rating-container">
                    {[1, 2, 3, 4, 5].map((val) => {
                      const displayActive = (hoverRating || rating) >= val;
                      return (
                        <button
                          key={val}
                          type="button"
                          className={`star-btn ${displayActive ? "active" : ""}`}
                          onClick={() => handleStarClick(val)}
                          onMouseEnter={() => handleStarMouseEnter(val)}
                          onMouseLeave={handleStarMouseLeave}
                          aria-label={`${val} Star${val > 1 ? "s" : ""}`}
                        >
                          &#9733;
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Review Textarea */}
                <div className="form-group">
                  <label htmlFor="review_text" className="form-label">Detailed Review</label>
                  <textarea
                    id="review_text"
                    value={reviewText}
                    onChange={handleTextChange}
                    className="form-textarea"
                    placeholder="What did you like or dislike? How was your experience?"
                    required
                    maxLength={1000}
                  ></textarea>
                  <div className="char-counter">
                    <span style={{ color: reviewText.length > 900 ? "var(--secondary-color)" : "var(--text-muted)" }}>
                      {reviewText.length}
                    </span>{" "}
                    / 1000
                  </div>
                </div>

                {/* Submit Button */}
                <button type="submit" className="btn-submit" disabled={submitting}>
                  <span>{submitting ? "Submitting..." : "Submit Review"}</span>
                  {submitting && <div className="spinner" style={{ display: "block" }}></div>}
                </button>
              </form>
            </div>
          )}

          {view === "success" && (
            <div className="success-view" style={{ display: "block" }}>
              <div className="success-icon">&#10003;</div>
              <h2 className="card-title">Thank You!</h2>
              <p className="card-subtitle" style={{ marginBottom: "20px" }}>
                Your feedback has been successfully submitted. We appreciate you taking the time to share your review!
              </p>
              <div className="success-buttons">
                <button
                  type="button"
                  onClick={handleNewReview}
                  className="btn-submit btn-new-review"
                >
                  Submit Another
                </button>
                <button
                  type="button"
                  onClick={handleDoneExit}
                  className="btn-submit btn-done"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {view === "exit" && (
            <div className="success-view" style={{ display: "block" }}>
              <div
                className="success-icon"
                style={{
                  background: "rgba(168, 85, 247, 0.15)",
                  borderColor: "var(--card-border-active)",
                  color: "#fff",
                  fontSize: "2.2rem",
                }}
              >
                👋
              </div>
              <h2 className="card-title">All Done!</h2>
              <p className="card-subtitle" style={{ marginBottom: "10px" }}>
                Your feedback session has ended.
              </p>
              <p className="card-subtitle" style={{ fontSize: "0.9rem", opacity: 0.8 }}>
                Thank you for helping us improve. You may now close this window safely.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
