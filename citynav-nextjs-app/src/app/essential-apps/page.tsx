"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useLocation } from "@/hooks/useLiveLocation";
import { FiExternalLink, FiSmartphone, FiMapPin } from "react-icons/fi";
import cityAppsData from "@/data/city-apps.json";

interface App {
  name: string;
  category: string;
  description: string;
  icon: string;
  url: string;
  webUrl: string;
}

interface CityApps {
  cityName: string;
  apps: App[];
}

export default function EssentialAppsPage() {
  const { location, loading } = useLocation();
  const [cityApps, setCityApps] = useState<CityApps | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  useEffect(() => {
    if (location?.city) {
      const cityKey = location.city.toLowerCase();
      const apps = (cityAppsData as any)[cityKey] || (cityAppsData as any)["default"];
      setCityApps(apps);
    } else {
      setCityApps((cityAppsData as any)["default"]);
    }
  }, [location]);

  const categories = cityApps 
    ? ["All", ...Array.from(new Set(cityApps.apps.map(app => app.category)))]
    : ["All"];

  const filteredApps = cityApps?.apps.filter(
    app => selectedCategory === "All" || app.category === selectedCategory
  ) || [];

  const handleAppClick = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 pb-20">
      <PageHeader title="Essential Apps" showBack backHref="/" />

      <div className="p-5">
        {/* Location Card */}
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg rounded-3xl p-6 mb-6 shadow-2xl border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <FiMapPin className="text-indigo-600 dark:text-indigo-400" size={24} />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 m-0">
              {loading ? "Detecting location..." : `Apps for ${cityApps?.cityName || "Your City"}`}
            </h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 m-0">
            Essential transport and navigation apps for your city
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                  selectedCategory === category
                    ? "bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 shadow-lg"
                    : "bg-white/90 dark:bg-slate-700/90 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Apps Grid */}
        <div className="grid gap-4">
          {filteredApps.map((app, index) => (
            <div
              key={index}
              className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg rounded-2xl p-5 shadow-xl border border-slate-200/50 dark:border-slate-700/50 hover:shadow-2xl transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl flex-shrink-0">{app.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
                      {app.name}
                    </h3>
                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-full">
                      {app.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {app.description}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAppClick(app.url)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors border-none cursor-pointer"
                    >
                      <FiSmartphone size={16} />
                      <span>Download App</span>
                    </button>
                    <button
                      onClick={() => handleAppClick(app.webUrl)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors border-none cursor-pointer"
                    >
                      <FiExternalLink size={16} />
                      <span>Website</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredApps.length === 0 && (
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg rounded-2xl p-8 text-center shadow-xl border border-slate-200/50 dark:border-slate-700/50">
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              No apps found for this category
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
