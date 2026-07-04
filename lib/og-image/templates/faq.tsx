import React from "react";

interface FaqOgData {
  title: string;
  description: string;
  siteName: string;
  siteDomain: string;
}

export function FaqOgTemplate({ data }: { data: FaqOgData }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#FAF8F5",
        backgroundImage: "radial-gradient(circle at 50% 0%, #FFE9E0 0%, #FAF8F5 50%)",
        padding: "80px",
        justifyContent: "space-between",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            backgroundColor: "#FF5A1F",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "18px",
          }}
        >
          <span style={{ color: "#FFF", fontSize: "24px", fontWeight: "bold" }}>?</span>
        </div>
        <span style={{ fontSize: "32px", fontWeight: "800", color: "#111827", letterSpacing: "-0.5px" }}>
          {data.siteName}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "40px" }}>
        <span
          style={{
            fontSize: "56px",
            fontWeight: "900",
            color: "#111827",
            lineHeight: "1.1",
            letterSpacing: "-2px",
            maxWidth: "950px",
          }}
        >
          {data.title}
        </span>
        <span
          style={{
            fontSize: "22px",
            color: "#4B5563",
            lineHeight: "1.5",
            maxWidth: "800px",
            fontWeight: "500",
          }}
        >
          {data.description}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid #E5E7EB",
          paddingTop: "40px",
          marginTop: "40px",
        }}
      >
        <span style={{ fontSize: "14px", color: "#9CA3AF", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase" }}>
          Frequently Asked Questions
        </span>
        <span style={{ fontSize: "16px", color: "#FF5A1F", fontWeight: "700" }}>
          {data.siteDomain}
        </span>
      </div>
    </div>
  );
}
