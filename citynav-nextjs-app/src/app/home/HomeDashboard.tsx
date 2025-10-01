"use client";

import { useEffect } from "react";
// import SafetyAlert from "./SafetyAlert";
import QuickActions from "../../components/QuickActions";
// import DailyTip from "./DailyTip";
// import RecentActivity from "./RecentActivity";
// import SosButton from "./SosButton";
// import BottomNav from "./BottomNav";
import styles from "../../styles/home.module.css";

export default function HomeDashboard() {
  useEffect(() => {
    // Update clock every minute
    const interval = setInterval(() => {
      const timeElement = document.getElementById("currentTime");
      if (timeElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
        timeElement.textContent = `Today, ${timeString}`;
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="citynav-bg">
      <div className="citynav-card">
        <div className={styles.dashboardContainer}>
          {/* Safety Alert */}
          {/* <SafetyAlert /> */}

          {/* Header */}
          <div className={styles.dashboardHeader}>
            <div className={styles.cityInfo}>
              <h3 id="cityName">Pune</h3>
              <span className="body-small">
                Today, <span id="currentTime">24°C</span>
              </span>
            </div>
            <div className={styles.weatherInfo}>
              <span className="material-icons" id="weatherIcon">
                wb_sunny
              </span>
              <span className="body-medium" id="temperature">
                24°C
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <QuickActions />

          {/* Daily Tip */}
          {/* <DailyTip /> */}

          {/* Recent Activity */}
          {/* <RecentActivity /> */}

          {/* Emergency SOS Button */}
          {/* <SosButton /> */}
        </div>
      </div>

      {/* Bottom Navigation */}
      {/* <BottomNav /> */}
    </div>
  );
}
