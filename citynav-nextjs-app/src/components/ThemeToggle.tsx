"use client";

import { useTheme } from "./ThemeProvider";
import { FiSun, FiMoon } from "react-icons/fi";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border border-slate-200 dark:border-slate-700 shadow-lg hover:scale-110 transition-all duration-300"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <FiMoon size={20} className="text-slate-700 dark:text-slate-300" />
      ) : (
        <FiSun size={20} className="text-yellow-500" />
      )}
    </button>
  );
}
