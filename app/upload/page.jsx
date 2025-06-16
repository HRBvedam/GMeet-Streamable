"use client";

import React, { useRef, useState } from "react";

const UploadPage = () => {
  const fileInputRef = useRef(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    setVideoUrl("");
    setLoading(true);
    setUploadProgress("Preparing upload...");

    const file = fileInputRef.current.files[0];

    // Validation
    if (!file) {
      setStatus("Please select a video file.");
      setLoading(false);
      return;
    }

    if (!username || !password) {
      setStatus("Please enter your Streamable credentials.");
      setLoading(false);
      return;
    }

    // Check file size (limit to 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB in bytes
    if (file.size > maxSize) {
      setStatus("File size too large. Maximum size is 500MB.");
      setLoading(false);
      return;
    }

    // Check file type
    const allowedTypes = [
      "video/mp4",
      "video/avi",
      "video/mov",
      "video/wmv",
      "video/flv",
      "video/webm",
    ];
    if (
      !allowedTypes.includes(file.type) &&
      !file.name.match(/\.(mp4|avi|mov|wmv|flv|webm)$/i)
    ) {
      setStatus(
        "Please select a valid video file (MP4, AVI, MOV, WMV, FLV, WebM)."
      );
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("username", username);
    formData.append("password", password);

    try {
      setUploadProgress("Uploading to Streamable...");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      console.log(res)

      const data = await res.json();


      console.log(data);

      if (res.ok && data.url) {
        setVideoUrl(data.url);
        setStatus("Upload successful!");
        setUploadProgress("");

        // Clear form
        setUsername("");
        setPassword("");
        fileInputRef.current.value = "";
      } else {
        setStatus(data.error || "Upload failed.");
        setUploadProgress("");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setStatus("An error occurred during upload. Please try again.");
      setUploadProgress("");
    }

    setLoading(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div
      style={{
        maxWidth: 500,
        margin: "40px auto",
        padding: 32,
        borderRadius: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        background: "#fff",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}>
      <h2
        style={{
          textAlign: "center",
          color: "#333",
          marginBottom: 32,
          fontSize: 24,
        }}>
        Upload Video to Streamable
      </h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontWeight: 600,
              color: "#555",
            }}>
            Streamable Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your Streamable username"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "2px solid #e1e5e9",
              fontSize: 16,
              transition: "border-color 0.2s",
              outline: "none",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#0070f3")}
            onBlur={(e) => (e.target.style.borderColor = "#e1e5e9")}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontWeight: 600,
              color: "#555",
            }}>
            Streamable Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your Streamable password"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "2px solid #e1e5e9",
              fontSize: 16,
              transition: "border-color 0.2s",
              outline: "none",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#0070f3")}
            onBlur={(e) => (e.target.style.borderColor = "#e1e5e9")}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontWeight: 600,
              color: "#555",
            }}>
            Video File
          </label>
          <input
            type="file"
            accept="video/*"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                setStatus(
                  `Selected: ${file.name} (${formatFileSize(file.size)})`
                );
              }
            }}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "2px dashed #e1e5e9",
              fontSize: 16,
              backgroundColor: "#f8f9fa",
            }}
          />
          <div
            style={{
              fontSize: 12,
              color: "#666",
              marginTop: 8,
            }}>
            Maximum file size: 500MB. Supported formats: MP4, AVI, MOV, WMV,
            FLV, WebM
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 8,
            background: loading ? "#ccc" : "#0070f3",
            color: "#fff",
            border: "none",
            fontWeight: 600,
            fontSize: 16,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background-color 0.2s",
          }}
          onMouseOver={(e) => {
            if (!loading) e.target.style.backgroundColor = "#0056b3";
          }}
          onMouseOut={(e) => {
            if (!loading) e.target.style.backgroundColor = "#0070f3";
          }}>
          {loading ? "Processing..." : "Upload Video"}
        </button>
      </form>

      {uploadProgress && (
        <div
          style={{
            marginTop: 20,
            padding: 12,
            borderRadius: 8,
            backgroundColor: "#e3f2fd",
            color: "#1976d2",
            textAlign: "center",
            fontWeight: 500,
          }}>
          {uploadProgress}
        </div>
      )}

      {status && (
        <div
          style={{
            marginTop: 20,
            padding: 12,
            borderRadius: 8,
            backgroundColor: videoUrl ? "#e8f5e8" : "#ffebee",
            color: videoUrl ? "#2e7d32" : "#c62828",
            textAlign: "center",
            fontWeight: 500,
          }}>
          {status}
        </div>
      )}

      {videoUrl && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 8,
            backgroundColor: "#f0f8ff",
            border: "1px solid #0070f3",
          }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 8,
              color: "#333",
            }}>
            Your video is ready!
          </div>
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "8px 16px",
              backgroundColor: "#0070f3",
              color: "white",
              textDecoration: "none",
              borderRadius: 6,
              fontWeight: 500,
              transition: "background-color 0.2s",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#0056b3")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#0070f3")}>
            View on Streamable →
          </a>
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "#666",
              wordBreak: "break-all",
            }}>
            {videoUrl}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 24,
          padding: 16,
          backgroundColor: "#f8f9fa",
          borderRadius: 8,
          fontSize: 14,
          color: "#666",
        }}>
        <strong>Note:</strong> You need a Streamable account to upload videos.
        The upload process may take a few minutes depending on your file size
        and internet connection.
      </div>
    </div>
  );
};

export default UploadPage;
