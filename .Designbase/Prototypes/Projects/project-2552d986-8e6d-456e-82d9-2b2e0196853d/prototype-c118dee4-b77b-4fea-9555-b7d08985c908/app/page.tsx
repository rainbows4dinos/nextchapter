"use client";

import React from "react";
import Link from "next/link";
import ExampleCard from "./_components/example-card";

export default function PrototypePage() {
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
          How prototypes work
        </h1>
        <span style={{ fontSize: "18px", lineHeight: "26px", opacity: 0.7 }}>
          This is a running Next.js app that uses your own components. Change it
          visually, in code, or by asking your agent.
        </span>
      </div>
      <ExampleCard />
      <Link href="/routes" style={{ fontSize: "16px", fontWeight: 500 }}>
        Next: how pages work →
      </Link>
    </main>
  );
}
