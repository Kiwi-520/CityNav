"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Slide = {
  icon: string;
  title: string;
  description: string;
};

const slides: Slide[] = [
  {
    icon: "offline_bolt",
    title: "Works Offline",
    description:
      "Navigate your city even without internet connection. All essential maps and routes are saved locally.",
  },
  {
    icon: "security",
    title: "Safety First",
    description:
      "Get real-time safety alerts, emergency contacts, and choose the safest routes to your destination.",
  },
  {
    icon: "explore",
    title: "Local Insights",
    description:
      "Discover essential places like hospitals, ATMs, and public transport with crowd-sourced information.",
  },
  {
    icon: "apps",
    title: "Essential Apps",
    description:
      "Important apps are suggested automatically based on your onboarded city so you can get services quickly.",
  },
  {
    icon: "alt_route",
    title: "Multimodal Routing",
    description:
      "Compare mixed travel options like walk, metro, bus, and rides to choose the most efficient route.",
  },
  {
    icon: "map",
    title: "Essential Maps",
    description:
      "Access city-focused offline maps with key places, neighborhoods, and transport lines ready when needed.",
  },
  {
    icon: "compare_arrows",
    title: "Route Options",
    description:
      "View multiple route choices with time and convenience hints so you can decide faster in real situations.",
  },
  {
    icon: "search",
    title: "Search & Discovery",
    description:
      "Find nearby essentials and discover local places with smart search built for city navigation use cases.",
  },
  {
    icon: "my_location",
    title: "Interactive Map",
    description:
      "Track your live position, explore around you, and navigate confidently with an interactive city map view.",
  },
];

export default function FeatureTourPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const startButtonStyle = {
    backgroundColor: "#2e7d5e",
    color: "#ffffff",
    borderColor: "#2e7d5e",
    borderRadius: "22px",
    minHeight: "40px",
    fontSize: "13px",
    fontWeight: 600,
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.08)",
  } as const;

  const isFirst = currentSlide === 0;
  const isLast = currentSlide === slides.length - 1;
  const nextLabel = useMemo(() => (isLast ? "Get Started" : "Next"), [isLast]);

  const onNext = () => {
    if (!isLast) {
      setCurrentSlide((prev) => prev + 1);
      return;
    }
    window.location.href = "/location-permission";
  };

  const onPrev = () => {
    if (!isFirst) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const active = slides[currentSlide];

  return (
    <div className="citynavBg">
      <div className="citynavCard">
        <div className="tourContainer">
          <div className="tourSlide active">
            <div className="tourIllustration">
              <span className="material-icons illustrationIcon">{active.icon}</span>
            </div>
            <h2 className="displayMedium">{active.title}</h2>
            <p className="bodyLarge">{active.description}</p>
          </div>

          <div className="tourNavigation">
            <Link
              className="btn btnSkip"
              href="/location-permission"
              style={{ color: "#8f948b", borderColor: "#b7bbb3" }}
            >
              Skip
            </Link>

            <div className="tourIndicators" aria-label="slide indicators">
              {slides.map((_, index) => (
                <div
                  key={index}
                  className={`indicator ${index === currentSlide ? "active" : ""}`}
                />
              ))}
            </div>

            <div className="navButtons">
              {!isFirst && (
                <button className="btn btnOutline" type="button" onClick={onPrev}>
                  <span className="material-icons">chevron_left</span>
                  Back
                </button>
              )}
              <button
                className={`btn btnPrimary ${isLast ? "startBtn" : ""}`}
                type="button"
                onClick={onNext}
                style={isLast ? startButtonStyle : undefined}
              >
                {nextLabel}
                {!isLast && <span className="material-icons">chevron_right</span>}
              </button>
            </div>
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
        }

        .citynavCard {
          width: min(100%, 380px);
          background-color: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
          padding: clamp(16px, 2.2vh, 24px);
          margin: 0 auto;
        }

        .tourContainer {
          position: relative;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .tourSlide {
          text-align: center;
        }

        .tourIllustration {
          width: min(100%, 300px);
          height: clamp(150px, 22vh, 200px);
          background: linear-gradient(135deg, #b8f2d9 0%, #c1e8fb 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: clamp(12px, 2vh, 24px) auto;
        }

        .illustrationIcon {
          font-size: clamp(82px, 15vw, 120px);
          color: #2e7d5e;
          opacity: 0.7;
          line-height: 1;
        }

        .displayMedium {
          font-size: clamp(30px, 6.2vw, 32px);
          font-weight: 400;
          line-height: 1.2;
          color: #1a1c19;
          margin: 0;
        }

        .bodyLarge {
          font-size: clamp(16px, 3.3vw, 18px);
          font-weight: 400;
          line-height: 1.45;
          color: #1a1c19;
          margin-top: 12px;
          margin-bottom: 0;
        }

        .tourNavigation {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: clamp(18px, 2.3vh, 24px);
          padding-top: clamp(10px, 1.6vh, 16px);
          border-top: 1px solid #c7c8bb;
          gap: 6px;
        }

        .tourIndicators {
          display: flex;
          gap: 3px;
          align-items: center;
          justify-content: center;
          min-width: 0;
          flex: 1;
          overflow: hidden;
        }

        .indicator {
          width: 6px;
          height: 6px;
          flex: 0 0 6px;
          border-radius: 9999px;
          background-color: #c7c8bb;
          transition: background-color 150ms ease;
        }

        .indicator.active {
          background-color: #2e7d5e;
        }

        .navButtons {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 14px;
          height: 40px;
          border-radius: 22px;
          border: 1px solid transparent;
          font-size: 13px;
          font-weight: 600;
          line-height: 1;
          text-decoration: none;
          cursor: pointer;
          transition: all 150ms ease;
          white-space: nowrap;
          background: transparent;
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .btnPrimary {
          background-color: #2e7d5e;
          color: #ffffff;
          border-color: #2e7d5e;
        }

        .btnPrimary:hover {
          background-color: #286f54;
          border-color: #286f54;
        }

        .startBtn {
          background-color: #2e7d5e !important;
          color: #ffffff !important;
          border-color: #2e7d5e !important;
        }

        .btnOutline {
          background-color: transparent;
          color: #1a1c19;
          border-color: #777865;
        }

        .btnSkip {
          background-color: transparent;
          color: #8f948b;
          border-color: #b7bbb3;
        }

        .btnSkip:hover {
          color: #757a72;
          border-color: #9da299;
        }

        @media (max-width: 640px) {
          .citynavCard {
            width: min(100%, 360px);
          }

          .tourNavigation {
            gap: 4px;
          }

          .btn {
            padding: 0 10px;
            height: 38px;
            font-size: 12px;
          }

          .tourIndicators {
            gap: 2px;
          }

          .indicator {
            width: 5px;
            height: 5px;
            flex-basis: 5px;
          }
        }
      `}</style>
    </div>
  );
}
