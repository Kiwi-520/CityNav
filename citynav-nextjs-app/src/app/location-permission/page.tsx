"use client";

import { useMemo, useState } from "react";

type PermissionState = "initial" | "loading" | "success" | "error";

export default function LocationPermissionPage() {
  const [state, setState] = useState<PermissionState>("initial");
  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        delay: Math.random() * 0.7,
        duration: 1.9 + Math.random() * 1.8,
        size: 6 + Math.random() * 8,
        rotation: Math.random() * 360,
        drift: -20 + Math.random() * 40,
        color: ["#2e7d5e", "#b8f2d9", "#3d6373", "#f9a825", "#e57373"][
          Math.floor(Math.random() * 5)
        ],
      })),
    []
  );

  const getCurrentPosition = () =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      });
    });

  const detectCityFromCoords = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
      );

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        address?: {
          city?: string;
          town?: string;
          village?: string;
          state_district?: string;
          state?: string;
        };
      };

      return (
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.state_district ||
        data.address?.state ||
        null
      );
    } catch {
      return null;
    }
  };

  const requestLocation = async () => {
    setState("loading");

    try {
      const position = await getCurrentPosition();

      localStorage.setItem(
        "userLocation",
        JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now(),
        })
      );

      const detectedCity = await detectCityFromCoords(
        position.coords.latitude,
        position.coords.longitude
      );

      if (detectedCity) {
        localStorage.setItem("detectedCity", detectedCity);
        localStorage.setItem("selectedCity", detectedCity);
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
      localStorage.setItem("locationPermission", "granted");
      setState("success");
    } catch {
      setState("error");
    }
  };

  const denyLocation = () => {
    localStorage.setItem("locationPermission", "denied");
    window.location.href = "/city-selection";
  };

  const continueToNext = () => {
    window.location.href = "/setup-complete";
  };

  return (
    <div className="citynavBg">
      {state === "success" && (
        <div className="confettiLayer" aria-hidden="true">
          {confettiPieces.map((piece) => (
            <span
              key={piece.id}
              className="confettiPiece"
              style={{
                left: `${piece.left}%`,
                width: `${piece.size}px`,
                height: `${piece.size * 0.62}px`,
                backgroundColor: piece.color,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                transform: `translateX(0) rotate(${piece.rotation}deg)`,
                ["--drift" as string]: `${piece.drift}px`,
              }}
            />
          ))}
        </div>
      )}

      <div className="citynavCard">
        {state === "success" && (
          <div className="cardConfetti" aria-hidden="true">
            {confettiPieces.slice(0, 22).map((piece) => (
              <span
                key={`card-${piece.id}`}
                className="cardConfettiPiece"
                style={{
                  left: `${piece.left}%`,
                  width: `${Math.max(4, piece.size - 2)}px`,
                  height: `${Math.max(3, piece.size * 0.5)}px`,
                  backgroundColor: piece.color,
                  animationDelay: `${piece.delay * 0.6}s`,
                  animationDuration: `${Math.max(1.5, piece.duration - 0.4)}s`,
                  transform: `translateX(0) rotate(${piece.rotation}deg)`,
                  ["--drift" as string]: `${piece.drift * 0.5}px`,
                }}
              />
            ))}
          </div>
        )}

        {state === "initial" && (
          <div className="permissionContent">
            <div className="permissionIcon">
              <span className="material-icons">location_on</span>
            </div>
            <h2 className="displayMedium">Enable Location</h2>
            <p className="bodyLarge">
              We need your location to provide accurate navigation and find nearby essential
              services.
            </p>

            <div className="permissionButtons">
              <button className="btn btnPrimary" type="button" onClick={requestLocation}>
                Allow
              </button>
              <button className="btn btnDeny" type="button" onClick={denyLocation}>
                Deny
              </button>
            </div>

            <div className="privacyNote">
              Your location data is stored locally on your device and never shared without your
              permission.
            </div>
          </div>
        )}

        {state === "loading" && (
          <div className="loadingState">
            <div className="spinner" />
            <h3 className="headlineSmall">Getting your location...</h3>
            <p className="bodyMedium">This may take a few seconds</p>
          </div>
        )}

        {state === "success" && (
          <div className="permissionContent">
            <div className="permissionIcon successBg">
              <span className="material-icons successText">check_circle</span>
            </div>
            <h2 className="displayMedium">Location Enabled!</h2>
            <p className="bodyLarge">
              Great! We can now provide you with personalized navigation and local information.
            </p>
            <button className="btn btnPrimary btnLarge" type="button" onClick={continueToNext}>
              Continue
            </button>
          </div>
        )}

        {state === "error" && (
          <div className="permissionContent">
            <div className="permissionIcon errorBg">
              <span className="material-icons errorText">location_off</span>
            </div>
            <h2 className="displayMedium">Location Access Denied</h2>
            <p className="bodyLarge">
              No worries! You can still use CityNav by manually selecting your city.
            </p>
            <button className="btn btnPrimary btnLarge" type="button" onClick={continueToNext}>
              Continue Manually
            </button>
            <button className="btn btnOutline" type="button" onClick={() => setState("initial")}>
              Try Again
            </button>
          </div>
        )}
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

        .confettiLayer {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 1;
        }

        .confettiPiece {
          position: absolute;
          top: -14px;
          border-radius: 2px;
          opacity: 0;
          animation-name: confettiDrop;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
        }

        .cardConfetti {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          border-radius: 16px;
          z-index: 3;
        }

        .cardConfettiPiece {
          position: absolute;
          top: -10px;
          border-radius: 2px;
          opacity: 0;
          animation-name: confettiCardDrop;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
        }

        @keyframes confettiCardDrop {
          0% {
            transform: translate3d(0, -10px, 0) rotate(0deg);
            opacity: 0;
          }

          10% {
            opacity: 0.8;
          }

          100% {
            transform: translate3d(var(--drift), 85dvh, 0) rotate(420deg);
            opacity: 0;
          }
        }

        @keyframes confettiDrop {
          0% {
            transform: translate3d(0, -14px, 0) rotate(0deg);
            opacity: 0;
          }

          12% {
            opacity: 1;
          }

          100% {
            transform: translate3d(var(--drift), 100dvh, 0) rotate(540deg);
            opacity: 0;
          }
        }

        .citynavCard {
          width: min(100%, 380px);
          background-color: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
          padding: clamp(16px, 2.2vh, 24px);
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }

        .permissionIcon {
          width: 64px;
          height: 64px;
          color: #2e7d5e;
          margin: 32px auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
        }

        .permissionIcon .material-icons {
          font-size: 64px;
          color: #2e7d5e;
        }

        .permissionContent {
          text-align: center;
          margin-bottom: 24px;
          position: relative;
          z-index: 4;
        }

        .permissionButtons {
          display: flex;
          gap: 16px;
          margin: 16px 0;
          justify-content: center;
        }

        .permissionButtons .btn {
          width: 165px;
          height: 40px;
        }

        .btnDeny {
          background: transparent;
          color: #ba1a1a;
          border: 1px solid #ba1a1a;
        }

        .privacyNote {
          font-size: 14px;
          opacity: 0.7;
          color: #1a1c19;
          text-align: center;
          margin-top: 16px;
        }

        .loadingState {
          text-align: center;
          margin: 24px 0;
          position: relative;
          z-index: 4;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #c7c8bb;
          border-top: 4px solid #2e7d5e;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 12px;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .successBg {
          background-color: #c8f7c5;
        }

        .successText.material-icons {
          color: #388e3c;
        }

        .errorBg {
          background-color: #ffdad6;
        }

        .errorText.material-icons {
          color: #ba1a1a;
        }

        .displayMedium {
          font-size: clamp(30px, 6.2vw, 32px);
          font-weight: 400;
          line-height: 1.2;
          color: #1a1c19;
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
          font-size: clamp(16px, 3.3vw, 18px);
          font-weight: 400;
          line-height: 1.45;
          color: #1a1c19;
          margin-top: 12px;
          margin-bottom: 0;
        }

        .bodyMedium {
          font-size: 16px;
          line-height: 1.4;
          margin-top: 8px;
          color: #47483e;
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
          background: transparent;
        }

        .btnPrimary {
          background-color: #2e7d5e;
          color: #ffffff;
          border-color: #2e7d5e;
        }

        .btnPrimary:hover {
          background-color: #286f54;
        }

        .btnLarge {
          width: 100%;
          min-height: 40px;
          margin-top: 16px;
          margin-bottom: 12px;
        }

        .btnOutline {
          background: transparent;
          color: #1a1c19;
          border-color: #777865;
          min-height: 40px;
          padding: 0 14px;
        }
      `}</style>
    </div>
  );
}
