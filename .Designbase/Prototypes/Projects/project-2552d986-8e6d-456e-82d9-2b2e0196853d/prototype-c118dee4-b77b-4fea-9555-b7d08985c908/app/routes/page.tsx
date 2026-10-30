"use client";

import React from "react";
import Link from "next/link";

export default function RoutesPage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "32px",
        padding: "48px 24px",
      }}
    >
      <div
        style={{
          maxWidth: "560px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "40px",
            lineHeight: "48px",
            fontWeight: 500,
          }}
        >
          Each folder is a page
        </h1>
        <span style={{ fontSize: "18px", lineHeight: "26px", opacity: 0.7 }}>
          This page lives in app/routes/page.tsx, so it opens at /routes. Add a
          folder with a page.tsx inside app to add a page, or ask your agent to
          add one.
        </span>
      </div>
      <Link href="/" style={{ fontSize: "16px", fontWeight: 500 }}>
        ← Back to the start
      </Link>
    </main>
  );
}
