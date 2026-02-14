import { NAV_SECTIONS } from "@/config/navigation";
import { ModuleCard } from "@/components/layout/ModuleCard";

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Flexi Operations
        </h1>
        <p className="mt-2 text-gray-500">
          Vyberte modul pro zahájení práce s ABRA Flexi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {NAV_SECTIONS.map((section) => (
          <ModuleCard key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
