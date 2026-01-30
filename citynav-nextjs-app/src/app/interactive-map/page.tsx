"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InteractiveMapRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/essential-maps");
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, var(--primary) 0%, var(--tertiary) 100%)",
        color: "white",
        backgroundAttachment: "fixed",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h2>Redirecting to Essential Maps...</h2>
        <p>Please wait while we load the interactive map.</p>
      </div>
    </div>
  );
}
