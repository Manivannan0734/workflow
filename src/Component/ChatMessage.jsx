"use client";
import React from "react";

export default function ChatMessage({ role, message }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: role === "user" ? "flex-end" : "flex-start",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          maxWidth: "70%",
          padding: "12px 15px",
          borderRadius: "12px",
          background: role === "user" ? "#DCF8C6" : "#EDEDED",
          fontSize: "15px",
          lineHeight: "1.4",
          whiteSpace: "pre-wrap",
          border: role === "assistant" ? "1px solid #ddd" : "none",
        }}
      >
        {message}
      </div>
    </div>
  );
}
