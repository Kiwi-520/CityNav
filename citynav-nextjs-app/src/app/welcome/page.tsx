"use client";

import Link from "next/link";

export default function WelcomePage() {
  const startButtonStyle = {
    backgroundColor: "#2e7d5e",
    color: "#ffffff",
    border: "1px solid #2e7d5e",
    borderRadius: "22px",
    minHeight: "40px",
    fontSize: "13px",
    fontWeight: 600,
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.08)",
  } as const;

  return (
    <div className="citynavBg">
      <div className="citynavCard">
        <Link className="skipSetup" href="/" style={{ color: "#8f948b" }}>
          Skip Setup
        </Link>

        <div className="welcomeIllustration">
          <span className="illustrationIcon">location_city</span>
        </div>

        <h1 className="displayLarge">Welcome to CityNav</h1>
        <p className="bodyLarge subtitle">Your offline city companion for safe exploration</p>

        <div className="languageSelector">
          <div className="langCard langCardActive">English</div>
          <div className="langCard">हिन्दी</div>
          <div className="langCard">मराठी</div>
        </div>

        <Link className="btn btnPrimary startBtn" href="/feature-tour" style={startButtonStyle}>
          Get Started
        </Link>
      </div>

      <style jsx>{`
        .citynavBg {
          height: 100dvh;
          min-height: 100svh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(8px, 2vh, 14px);
          background-color: #fdfdf7;
          overflow: hidden;
        }

        .citynavCard {
          width: min(100%, 360px);
          background-color: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
          padding: clamp(16px, 2.3vh, 24px);
          margin: 0 auto;
          position: relative;
        }

        .skipSetup {
          position: absolute;
          top: 10px;
          right: 16px;
          font-size: 12px;
          color: #8f948b;
          text-decoration: none;
          padding: 6px;
          border-radius: 4px;
          transition: all 150ms ease;
        }

        .skipSetup,
        .skipSetup:visited {
          color: #8f948b;
        }

        .skipSetup:hover {
          color: #6f746b;
          text-decoration: underline;
        }

        .welcomeIllustration {
          width: 100%;
          height: clamp(132px, 25vh, 195px);
          background: linear-gradient(135deg, #b8f2d9 0%, #e0f0e6 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: clamp(18px, 3vh, 24px) auto clamp(14px, 2.2vh, 20px);
        }

        .illustrationIcon {
          font-family: "Material Icons", sans-serif;
          font-size: clamp(84px, 16vw, 120px);
          color: #2e7d5e;
          opacity: 0.7;
          line-height: 1;
        }

        .displayLarge {
          font-size: clamp(36px, 7.8vw, 40px);
          font-weight: 400;
          line-height: 1.1;
          color: #1a1c19;
          letter-spacing: -0.25px;
          text-align: center;
          margin: 0;
        }

        .bodyLarge {
          font-size: clamp(16px, 3.4vw, 18px);
          font-weight: 400;
          line-height: 1.45;
          color: #1a1c19;
        }

        .subtitle {
          text-align: center;
          opacity: 0.7;
          margin-bottom: clamp(14px, 2vh, 20px);
          margin-top: 8px;
        }

        .languageSelector {
          display: flex;
          gap: 10px;
          margin: 0 0 clamp(14px, 2.2vh, 20px);
          justify-content: center;
        }

        .langCard {
          width: 100%;
          max-width: 108px;
          height: clamp(56px, 8.8vh, 72px);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background-color: #fdfdf7;
          border: 1px solid #2e7d5e;
          color: #1a1c19;
          transition: all 150ms ease;
          font-weight: 500;
          font-size: clamp(14px, 2.9vw, 16px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        }

        .langCardActive {
          background-color: #b8f2d9;
          color: #ffffff;
          border-color: #2e7d5e;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 40px;
          padding: 0 14px;
          border: 1px solid transparent;
          border-radius: 22px;
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          font-weight: 600;
          line-height: 1;
          cursor: pointer;
          text-decoration: none;
          transition: all 150ms ease;
          white-space: nowrap;
        }

        .btnPrimary {
          background-color: #2e7d5e !important;
          color: #ffffff !important;
          border: 1px solid #2e7d5e;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        }

        .btnPrimary:hover {
          background-color: #286f54;
        }

        .startBtn {
          background-color: #2e7d5e !important;
          color: #ffffff !important;
          border: 1px solid #2e7d5e;
          min-width: 132px;
          width: fit-content;
          margin: 0 auto;
        }

        @media (max-width: 640px) {
          .citynavBg {
            padding-left: 10px;
            padding-right: 10px;
          }

          .citynavCard {
            width: min(100%, 350px);
          }
        }
      `}</style>
    </div>
  );
}
