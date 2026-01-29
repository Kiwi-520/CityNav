"use client";

import Link from "next/link";
import { FiSearch, FiNavigation, FiMap, FiDownload } from "react-icons/fi";

export default function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <Link href="/search-discovery" className="flex flex-col items-center gap-2 no-underline">
        <button className="bg-indigo-500 dark:bg-indigo-600 text-white border-none w-14 h-14 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors shadow-lg">
          <FiSearch size={24} />
        </button>
        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Find Place</span>
      </Link>

      <Link href="/route-options" className="flex flex-col items-center gap-2 no-underline">
        <button className="bg-indigo-500 dark:bg-indigo-600 text-white border-none w-14 h-14 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors shadow-lg">
          <FiNavigation size={24} />
        </button>
        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Plan Route</span>
      </Link>

      <Link href="/essential-maps" className="flex flex-col items-center gap-2 no-underline">
        <button className="bg-indigo-500 dark:bg-indigo-600 text-white border-none w-14 h-14 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors shadow-lg">
          <FiMap size={24} />
        </button>
        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Essentials</span>
      </Link>

      <Link href="/essential-maps" className="flex flex-col items-center gap-2 no-underline">
        <button className="bg-indigo-500 dark:bg-indigo-600 text-white border-none w-14 h-14 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors shadow-lg">
          <FiDownload size={24} />
        </button>
        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Offline Packs</span>
      </Link>
    </div>
  );
}
