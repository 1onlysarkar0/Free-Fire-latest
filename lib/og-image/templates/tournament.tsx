import React from "react";
import { TournamentOgData } from "../index";

export function TournamentOgTemplate({ data }: { data: TournamentOgData }) {
  const isFree = data.entryFee === 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#FAF8F5", // Forced cream theme
        backgroundImage: "radial-gradient(circle at 100% 100%, #FFE9E0 0%, #FAF8F5 60%)",
        padding: "60px",
        justifyContent: "space-between",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Top Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* Logo Circle */}
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "#FF5A1F",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "15px",
            }}
          >
            <span style={{ color: "#FFF", fontSize: "20px", fontWeight: "bold" }}>1</span>
          </div>
          <span style={{ fontSize: "28px", fontWeight: "800", color: "#111827", letterSpacing: "-0.5px" }}>
            {data.siteName}
          </span>
        </div>
        
        {/* Status Badge */}
        <div
          style={{
            display: "flex",
            backgroundColor: data.status === "LIVE" ? "#FEE2E2" : "#E0F2FE",
            padding: "8px 18px",
            borderRadius: "20px",
            border: `1px solid ${data.status === "LIVE" ? "#FCA5A5" : "#BAE6FD"}`,
          }}
        >
          <span
            style={{
              fontSize: "14px",
              fontWeight: "700",
              color: data.status === "LIVE" ? "#DC2626" : "#0284C7",
              letterSpacing: "1px",
            }}
          >
            {data.status}
          </span>
        </div>
      </div>

      {/* Middle Section */}
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              fontSize: "14px",
              fontWeight: "700",
              color: "#FF5A1F",
              textTransform: "uppercase",
              letterSpacing: "2px",
            }}
          >
            {data.gameMode.replace(/_/g, " ")} • {data.format.toUpperCase()}
          </span>
        </div>
        <span
          style={{
            fontSize: "56px",
            fontWeight: "900",
            color: "#111827",
            lineHeight: "1.15",
            letterSpacing: "-1.5px",
            maxWidth: "900px",
          }}
        >
          {data.tournamentName}
        </span>
      </div>

      {/* Bottom Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          width: "100%",
          borderTop: "1px solid #E5E7EB",
          paddingTop: "35px",
        }}
      >
        <div style={{ display: "flex", gap: "40px" }}>
          {/* Prize Pool */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "14px", color: "#6B7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "5px" }}>
              Prize Pool
            </span>
            <span style={{ fontSize: "36px", fontWeight: "800", color: "#111827" }}>
              ₹{data.prizePool.toLocaleString()}
            </span>
          </div>

          {/* Entry Fee */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "14px", color: "#6B7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "5px" }}>
              Entry Fee
            </span>
            <span style={{ fontSize: "36px", fontWeight: "800", color: isFree ? "#16A34A" : "#111827" }}>
              {isFree ? "FREE" : `₹${data.entryFee}`}
            </span>
          </div>
        </div>

        {/* Start Time */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontSize: "14px", color: "#6B7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "5px" }}>
            Starts On
          </span>
          <span style={{ fontSize: "24px", fontWeight: "700", color: "#4B5563" }}>
            {data.startTime}
          </span>
        </div>
      </div>
    </div>
  );
}
