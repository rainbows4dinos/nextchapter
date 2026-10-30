"use client";

import React from "react";

export default function ExampleCard() {
  return (
    <a
      href="#"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: "var(--nc-space-1)",
        width: "280px",
        padding: "var(--nc-space-3)",
        border: "1px solid var(--nc-card-border)",
        borderRadius: "var(--nc-radius-default)",
        backgroundColor: "var(--nc-card-bg)",
        color: "var(--nc-card-fg)",
        textDecoration: "none",
        fontFamily: "var(--nc-type-body-default-family)",
        fontSize: "var(--nc-type-body-default-size)",
        fontWeight: "var(--nc-type-body-default-weight)",
        lineHeight: "var(--nc-type-body-default-line-height)",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--nc-space-1-5)",
          minWidth: "0",
          paddingBottom: "var(--nc-space-1-5)",
        }}
      >
        <span className="nc-avatar nc-avatar--company nc-avatar--sm">
          <span>N</span>
        </span>
        <span
          style={{
            color: "var(--nc-link-default)",
            fontFamily: "var(--nc-type-ui-button-family)",
            fontSize: "var(--nc-type-ui-button-size)",
            fontWeight: "var(--nc-type-ui-button-weight)",
            lineHeight: "var(--nc-type-ui-button-line-height)",
          }}
        >
          Northwind Labs
        </span>
      </span>
      <span style={{ display: "block", color: "var(--nc-text-primary)" }}>
        Principal Product Designer
      </span>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--nc-space-1-5)",
          minHeight: "24px",
          paddingTop: "var(--nc-space-1)",
        }}
      >
        <span className="nc-status-badge nc-status-badge--active">
          Interviewing
        </span>
        <span
          style={{
            color: "var(--nc-text-secondary)",
            textAlign: "right",
            fontFamily: "var(--nc-type-caption-family)",
            fontSize: "var(--nc-type-caption-size)",
            fontWeight: "var(--nc-type-caption-weight)",
            lineHeight: "var(--nc-type-caption-line-height)",
          }}
        >
          Applied Oct 21
        </span>
      </span>
    </a>
  );
}
