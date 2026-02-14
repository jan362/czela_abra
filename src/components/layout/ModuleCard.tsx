"use client";

import Link from "next/link";
import type { NavSection } from "@/config/navigation";

interface Props {
  section: NavSection;
}

export function ModuleCard({ section }: Props) {
  return (
    <Link href={section.href}>
      <div className="group border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-200 bg-white">
        <div className="flex items-start gap-4">
          <span className="text-3xl">{section.icon}</span>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {section.labelCs}
            </h2>
            <p className="text-xs text-gray-400 mb-2">{section.label}</p>
            <p className="text-sm text-gray-600">{section.description}</p>
          </div>
          <span className="text-gray-300 group-hover:text-blue-400 transition-colors text-xl">
            &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
