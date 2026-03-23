"use client";

import Link from "next/link";
import { FiArrowLeft, FiMenu, FiSettings } from "react-icons/fi";

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  backHref?: string;
  showMenu?: boolean;
  onMenuClick?: () => void;
}

export default function PageHeader({
  title,
  showBack = false,
  backHref = "/",
  showMenu = false,
  onMenuClick,
}: PageHeaderProps) {
  const isBrandOnly = title === "CityNav";

  return (
    <header className="sticky top-0 z-[100] bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBack && (
          <Link
            href={backHref}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 no-underline flex items-center p-1.5 transition-colors"
          >
            <FiArrowLeft size={18} />
          </Link>
        )}
        <div className="flex flex-col">
          <h1 className="m-0 text-lg font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent leading-tight">
            CityNav
          </h1>
          {!isBrandOnly && (
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
              {title}
            </span>
          )}
        </div>
      </div>

      {showMenu && (
        <button
          onClick={onMenuClick}
          className="bg-transparent border-none p-1.5 text-slate-900 dark:text-slate-100 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <FiSettings size={18} />
        </button>
      )}
    </header>
  );
}
