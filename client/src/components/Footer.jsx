// client/src/components/Footer.jsx
import React from "react";

export default function Footer() {
  return (
    <div
      style={{
        marginTop: 30,
        padding: "12px 0",
        textAlign: "center",
        fontSize: 14,
        color: "#cfc6ac",
        opacity: 0.8
      }}
    >
      Developed by <strong>Code Leaf</strong> |{" "}
      <a
        href="https://www.codeleaf.co.in"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#ffd166" }}
      >
        www.codeleaf.co.in
      </a>
    </div>
  );
}
