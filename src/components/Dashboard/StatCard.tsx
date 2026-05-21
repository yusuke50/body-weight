import * as icons from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: string;
}

export function StatCard({ title, value, subtitle, icon }: StatCardProps) {
  const Icon = icon ? (icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[icon] : null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {Icon && <Icon className="w-6 h-6 text-gray-400" />}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && (
        <p className={`text-sm mt-1 ${subtitle.startsWith('+') ? 'text-red-600' : 'text-green-600'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
