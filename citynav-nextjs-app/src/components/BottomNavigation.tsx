"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiHome,
  FiSearch,
  FiNavigation,
  FiMap,
} from "react-icons/fi";

export default function BottomNavigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: FiHome, label: "Home" },
    { href: "/search-discovery", icon: FiSearch, label: "Search" },
    { href: "/route-options", icon: FiNavigation, label: "Routes" },
    { href: "/essential-maps", icon: FiMap, label: "Maps" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 py-3 z-[1000]">
      <div className="flex justify-around items-center max-w-[600px] mx-auto">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 no-underline text-xs p-2 rounded-lg min-w-[60px] transition-all ${
                isActive
                  ? "text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-slate-600 dark:text-slate-400 font-normal hover:text-indigo-500 dark:hover:text-indigo-300"
              }`}
            >
              <IconComponent size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
