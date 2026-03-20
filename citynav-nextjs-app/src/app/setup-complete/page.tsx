"use client";

import { useEffect, useMemo, useState } from "react";

export default function SetupCompletePage() {
  const [detectedCity, setDetectedCity] = useState("Pune");

  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 50 }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 2,
        size: 7 + Math.random() * 7,
        rotation: Math.random() * 360,
        color: ["#2e7d5e", "#5d7c6b", "#3d6373", "#388e3c", "#f9a825"][
          Math.floor(Math.random() * 5)
        ],
      })),
    []
  );

  const cardConfettiPieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 1.8 + Math.random() * 1.6,
        size: 5 + Math.random() * 7,
        rotation: Math.random() * 360,
        color: ["#2e7d5e", "#5d7c6b", "#3d6373", "#388e3c", "#f9a825"][
          Math.floor(Math.random() * 5)
        ],
      })),
    []
  );

  useEffect(() => {
    const city = localStorage.getItem("detectedCity") || localStorage.getItem("selectedCity");
    if (city) {
      setDetectedCity(city);
    }

    localStorage.setItem("setupComplete", "true");
    localStorage.setItem("setupCompletedAt", Date.now().toString());
  }, []);

  return (
    <div className="citynavBg">
      <div className="celebrationConfetti" aria-hidden="true">
        {confettiPieces.map((piece) => (
          <span
            key={piece.id}
            className="confettiPiece"
            style={{
              left: `${piece.left}%`,
              width: `${piece.size}px`,
              height: `${piece.size}px`,
              backgroundColor: piece.color,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              transform: `rotate(${piece.rotation}deg)`,
            }}
          />
        ))}
      </div>

      <div className="citynavCard">
        <div className="cardCelebrationConfetti" aria-hidden="true">
          {cardConfettiPieces.map((piece) => (
            <span
              key={piece.id}
              className="cardConfettiPiece"
              style={{
                left: `${piece.left}%`,
                width: `${piece.size}px`,
                height: `${Math.max(3, piece.size * 0.6)}px`,
                backgroundColor: piece.color,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                transform: `rotate(${piece.rotation}deg)`,
              }}
            />
          ))}
        </div>

        <div className="cardContent">
        <div className="successAnimation">
          <div className="successIcon">
            <span className="material-icons">check_circle</span>
          </div>
          <h1 className="displayLarge">Setup Complete!</h1>
          <p className="bodyLarge">
            Welcome to CityNav! You&apos;re all set to explore your city safely and confidently.
          </p>
        </div>

        <div className="setupSummary">
          <h3 className="headlineSmall">Your Setup Summary</h3>
          <div className="summaryItem">
            <span className="material-icons">check</span>
            <span className="bodyMedium">Location services enabled</span>
          </div>
          <div className="summaryItem">
            <span className="material-icons">check</span>
            <span className="bodyMedium">
              City detected: <strong>{detectedCity}</strong>
            </span>
          </div>
          <div className="summaryItem">
            <span className="material-icons">check</span>
            <span className="bodyMedium">Essential maps downloaded for offline use</span>
          </div>
          <div className="summaryItem">
            <span className="material-icons">check</span>
            <span className="bodyMedium">Safety features activated</span>
          </div>
        </div>

        <div className="actionButtons">
          <button className="btn btnPrimary btnLarge" onClick={() => (window.location.href = "/?dashboard=1") }>
            <span className="material-icons">home</span>
            Go to Dashboard
          </button>
          <button className="btn btnSecondary" onClick={() => (window.location.href = "/interactive-map") }>
            <span className="material-icons">map</span>
            Explore Map First
          </button>
        </div>
        </div>
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
          position: relative;
        }

        .citynavCard {
          width: min(100%, 390px);
          max-height: calc(100dvh - 22px);
          overflow: auto;
          background-color: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
          padding: clamp(16px, 2vh, 24px);
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }

        .cardCelebrationConfetti {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          border-radius: 16px;
          z-index: 3;
        }

        .cardConfettiPiece {
          position: absolute;
          top: -12px;
          animation: cardConfettiFall 2.8s ease-in-out forwards;
          opacity: 0;
        }

        @keyframes cardConfettiFall {
          0% {
            transform: translateY(-30px) rotate(0deg);
            opacity: 0;
          }
          12% {
            opacity: 0.85;
          }
          100% {
            transform: translateY(520px) rotate(300deg);
            opacity: 0;
          }
        }

        .cardContent {
          position: relative;
          z-index: 4;
        }

        .successAnimation {
          text-align: center;
          margin: 24px 0;
        }

        .successIcon {
          width: 120px;
          height: 120px;
          background-color: #c8f7c5;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          animation: successPulse 2s ease-in-out infinite;
        }

        .successIcon .material-icons {
          font-size: 64px;
          color: #388e3c;
        }

        @keyframes successPulse {
          0%,
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(56, 142, 60, 0.2);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 20px rgba(56, 142, 60, 0);
          }
        }

        .setupSummary {
          background-color: #e6e3da;
          border-radius: 16px;
          padding: 16px;
          margin: 24px 0;
        }

        .summaryItem {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .summaryItem:last-child {
          margin-bottom: 0;
        }

        .summaryItem .material-icons {
          color: #388e3c;
          font-size: 16px;
        }

        .actionButtons {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 24px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 40px;
          border: 1px solid transparent;
          border-radius: 22px;
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          font-weight: 600;
          line-height: 1;
          cursor: pointer;
          text-decoration: none;
          padding: 0 14px;
          transition: all 150ms ease;
        }

        .btnPrimary {
          background-color: #2e7d5e;
          color: #ffffff;
          border-color: #2e7d5e;
        }

        .btnSecondary {
          background-color: #5d7c6b;
          color: #ffffff;
          border-color: #5d7c6b;
        }

        .btnLarge {
          width: 100%;
        }

        .displayLarge {
          font-size: clamp(34px, 7vw, 40px);
          font-weight: 400;
          line-height: 1.1;
          color: #1a1c19;
          letter-spacing: -0.25px;
          margin: 0;
        }

        .headlineSmall {
          font-size: 24px;
          font-weight: 500;
          line-height: 1.2;
          color: #1a1c19;
          margin: 0;
        }

        .bodyLarge {
          font-size: 18px;
          line-height: 1.45;
          margin-top: 8px;
          color: #1a1c19;
        }

        .bodyMedium {
          font-size: 16px;
          line-height: 1.4;
          color: #1a1c19;
        }

        .celebrationConfetti {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
          overflow: hidden;
        }

        .confettiPiece {
          position: absolute;
          top: -14px;
          animation: confettiFall 3s ease-in-out forwards;
        }

        @keyframes confettiFall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
