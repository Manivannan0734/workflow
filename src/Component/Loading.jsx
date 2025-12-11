"use client";

import React from "react";

export default function LoadingSkeletonRows({ rows = 5 }) {
  return (
    <>
      {[...Array(rows)].map((_, i) => (
        <tr key={i}>
          {[...Array(9)].map((__, j) => (
            <td key={j} style={{ padding: "10px" }}>
              <div
                className="ui placeholder"
                style={{
                  height: "18px", // a bit thicker
                  borderRadius: "8px",
                  background:
                    "linear-gradient(90deg, #e0e0e0, #f5f5f5, #e0e0e0)",
                  backgroundSize: "200% 100%",
                  animation: "shine 1.6s infinite linear",
                  boxShadow: "0 0 10px rgba(255,255,255,0.4)",
                }}
              ></div>
            </td>
          ))}
        </tr>
      ))}

      <style>
        {`
          @keyframes shine {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}
      </style>
    </>
  );
}
