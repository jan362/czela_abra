"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_SECTIONS } from "@/config/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";

export function Sidebar() {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  const toggleMenu = (sectionId: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  return (
    <nav className="w-64 min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Logo / brand */}
      <div className="p-6 border-b border-gray-700">
        <Link href="/" className="text-xl font-bold text-white hover:text-blue-400 transition-colors">
          Flexi Operations
        </Link>
        <p className="text-xs text-gray-400 mt-1">ABRA Flexi</p>
      </div>

      {/* Navigation links */}
      <div className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {NAV_SECTIONS.map((section) => {
            const isActive = pathname.startsWith(section.href) && section.href !== "#";
            const hasSubmenu = section.submenu && section.submenu.length > 0;
            const isExpanded = expandedMenus.has(section.id);

            // Pokud má submenu, zkontroluj, zda je aktivní nějaká položka v submenu
            const isSubmenuActive = hasSubmenu && section.submenu!.some(
              (sub) => pathname.startsWith(sub.href)
            );

            return (
              <li key={section.id}>
                {hasSubmenu ? (
                  // Položka s submenu
                  <>
                    <button
                      onClick={() => toggleMenu(section.id)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isSubmenuActive
                          ? "bg-gray-800 text-white font-medium"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{section.icon}</span>
                        <span>{section.labelCs}</span>
                      </div>
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* Submenu */}
                    {isExpanded && (
                      <ul className="mt-1 ml-4 space-y-1 border-l-2 border-gray-700 pl-3">
                        {section.submenu!.map((subItem) => {
                          const isSubActive = pathname.startsWith(subItem.href);
                          return (
                            <li key={subItem.id}>
                              <Link
                                href={subItem.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                  isSubActive
                                    ? "bg-blue-600 text-white font-medium"
                                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                                }`}
                              >
                                <span className="text-base">{subItem.icon}</span>
                                <span>{subItem.labelCs}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                ) : (
                  // Běžná položka bez submenu
                  <Link
                    href={section.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white font-medium"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    <span className="text-lg">{section.icon}</span>
                    <span>{section.labelCs}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Settings and Logout at bottom */}
      <div className="p-3 border-t border-gray-700 space-y-2">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            pathname === "/settings"
              ? "bg-blue-600 text-white font-medium"
              : "text-gray-300 hover:bg-gray-800 hover:text-white"
          }`}
        >
          <span className="text-lg">&#9881;</span>
          <span>Nastavení</span>
        </Link>
        <LogoutButton />
      </div>
    </nav>
  );
}
