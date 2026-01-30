"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FiSun,
  FiMapPin,
  FiClock,
  FiWifi,
  FiWifiOff,
  FiNavigation,
  FiGlobe,
  FiMoon,
  FiSmartphone,
  FiExternalLink,
} from "react-icons/fi";
import QuickActions from "../../components/QuickActions";
import PageHeader from "../../components/PageHeader";
import { useLocation } from "@/hooks/useLiveLocation";
import cityAppsData from "@/data/city-apps.json";

export type LanguageKey = 'en' | 'hi' | 'mr';
export type ThemeKey = 'light' | 'dark' | 'system';

const languages = [
  { code: 'en' as LanguageKey, label: 'English' },
  { code: 'hi' as LanguageKey, label: 'हिंदी' },
  { code: 'mr' as LanguageKey, label: 'मराठी' },
];

const themes = [
  { code: 'light' as ThemeKey, label: 'Light', icon: FiSun },
  { code: 'dark' as ThemeKey, label: 'Dark', icon: FiMoon },
  { code: 'system' as ThemeKey, label: 'System', icon: FiGlobe },
];

export default function HomeDashboard() {
  const [currentTime, setCurrentTime] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState<LanguageKey>('en');
  const [theme, setTheme] = useState<ThemeKey>('system');
  const [cityApps, setCityApps] = useState<any>(null);
  const { location, error, loading, requestLocation } = useLocation();

  useEffect(() => {
    // Update clock
    const updateTime = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setCurrentTime(timeString);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);

    // Check online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    // Load saved language
    const savedLanguage = localStorage.getItem('appLanguage') as LanguageKey;
    if (savedLanguage) setLanguage(savedLanguage);

    // Load saved theme
    const savedTheme = localStorage.getItem('appTheme') as ThemeKey;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    // Update city apps based on location
    if (location?.city) {
      const cityKey = location.city.toLowerCase();
      const apps = (cityAppsData as any)[cityKey] || (cityAppsData as any)["default"];
      setCityApps(apps);
    } else {
      setCityApps((cityAppsData as any)["default"]);
    }
  }, [location]);

  const handleLanguageChange = (newLang: LanguageKey) => {
    setLanguage(newLang);
    localStorage.setItem('appLanguage', newLang);
  };

  const applyTheme = (newTheme: ThemeKey) => {
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
    } else {
      // System theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const handleThemeChange = (newTheme: ThemeKey) => {
    setTheme(newTheme);
    localStorage.setItem('appTheme', newTheme);
    applyTheme(newTheme);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 pb-24">
      <PageHeader title="CityNav" showMenu onMenuClick={() => setShowSettings(!showSettings)} />

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
          <div 
            className="absolute top-16 right-5 bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 min-w-[300px] max-w-[320px] border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Language Settings */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                <FiGlobe className="text-indigo-600 dark:text-indigo-400" size={20} />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 m-0">Language</h3>
              </div>
              <div className="space-y-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-all border ${
                      language === lang.code
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 font-semibold'
                        : 'bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Settings */}
            <div>
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                <FiSun className="text-indigo-600 dark:text-indigo-400" size={20} />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 m-0">Theme</h3>
              </div>
              <div className="space-y-2">
                {themes.map((themeOption) => {
                  const IconComponent = themeOption.icon;
                  return (
                    <button
                      key={themeOption.code}
                      onClick={() => handleThemeChange(themeOption.code)}
                      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all border ${
                        theme === themeOption.code
                          ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 font-semibold'
                          : 'bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <IconComponent size={18} />
                      <span>{themeOption.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-5">
        {/* Welcome Card */}
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg rounded-3xl p-6 mb-6 shadow-2xl border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="m-0 mb-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                Welcome to {location ? location.city : "CityNav"}
              </h2>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                <FiClock size={16} />
                <span>Today, {currentTime}</span>
              </div>

              {location && (
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm mt-1">
                  <FiMapPin size={14} />
                  <span>
                    {location.city}, {location.country}
                  </span>
                </div>
              )}

              {!location && !loading && (
                <button
                  onClick={requestLocation}
                  className="flex items-center gap-2 bg-indigo-600 dark:bg-indigo-500 text-white border-none px-3 py-2 rounded-lg text-sm cursor-pointer mt-2 hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                >
                  <FiNavigation size={14} />
                  <span>Enable Location</span>
                </button>
              )}
            </div>

            <div className="flex flex-col items-center gap-2">
              <FiSun size={32} className="text-amber-500 dark:text-amber-400" />
              <span className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                24°C
              </span>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center gap-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2">
              <FiMapPin size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm text-slate-900 dark:text-slate-100">
                Location Services Active
              </span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {isOnline ? (
                <>
                  <FiWifi size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm text-emerald-600 dark:text-emerald-400">
                    Online
                  </span>
                </>
              ) : (
                <>
                  <FiWifiOff size={16} className="text-red-600 dark:text-red-400" />
                  <span className="text-sm text-red-600 dark:text-red-400">
                    Offline
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg rounded-3xl p-6 mb-6 shadow-2xl border border-slate-200/50 dark:border-slate-700/50">
          <h3 className="m-0 mb-5 text-xl font-semibold text-slate-900 dark:text-slate-100">
            Quick Actions
          </h3>
          <QuickActions />
        </div>

        {/* Essential Apps */}
        {cityApps && (
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg rounded-3xl p-6 mb-6 shadow-2xl border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FiSmartphone className="text-indigo-600 dark:text-indigo-400" size={24} />
                <h3 className="m-0 text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Essential Apps for {cityApps.cityName}
                </h3>
              </div>
              <Link href="/essential-apps" className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:text-indigo-700 dark:hover:text-indigo-300 no-underline">
                View All
              </Link>
            </div>
            <div className="grid gap-3">
              {cityApps.apps.slice(0, 4).map((app: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
                  onClick={() => window.open(app.url, '_blank')}
                >
                  <div className="text-2xl">{app.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="m-0 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {app.name}
                      </h4>
                      <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-full">
                        {app.category}
                      </span>
                    </div>
                    <p className="m-0 text-xs text-slate-600 dark:text-slate-400 truncate">
                      {app.description}
                    </p>
                  </div>
                  <FiExternalLink className="text-slate-400 dark:text-slate-500" size={16} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips Card */}
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg rounded-3xl p-6 shadow-2xl border border-slate-200/50 dark:border-slate-700/50">
          <h3 className="m-0 mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
            Daily Tip
          </h3>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800">
            <p className="m-0 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
              💡 Download offline maps before traveling to avoid data charges
              and ensure navigation even without internet connectivity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
