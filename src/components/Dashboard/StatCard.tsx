interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: string;
}

export function StatCard({ title, value, subtitle, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {icon && <span className="text-2xl">{icon}</span>}
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
