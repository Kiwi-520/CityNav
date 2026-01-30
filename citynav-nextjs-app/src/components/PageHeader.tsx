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
  return (
    <header className="sticky top-0 z-[100] bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700 px-5 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {showBack && (
          <Link
            href={backHref}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 no-underline flex items-center p-2 transition-colors"
          >
            <FiArrowLeft size={20} />
          </Link>
        )}
        <h1 className="m-0 text-2xl font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h1>
      </div>

      {showMenu && (
        <button
          onClick={onMenuClick}
          className="bg-transparent border-none p-2 text-slate-900 dark:text-slate-100 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <FiSettings size={20} />
        </button>
      )}
    </header>
  );
}
