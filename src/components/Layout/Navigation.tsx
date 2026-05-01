interface NavigationProps {
  currentView: 'dashboard' | 'charts' | 'data' | 'settings';
  onViewChange: (view: 'dashboard' | 'charts' | 'data' | 'settings') => void;
}

export function Navigation({ currentView, onViewChange }: NavigationProps) {
  const navItems = [
    { id: 'dashboard' as const, label: '儀表板', icon: '📊' },
    { id: 'charts' as const, label: '圖表', icon: '📈' },
    { id: 'data' as const, label: '資料管理', icon: '📝' },
    { id: 'settings' as const, label: '設定', icon: '⚙️' },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`
                py-4 px-3 inline-flex items-center gap-2 border-b-2 text-sm font-medium
                transition-colors
                ${
                  currentView === item.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
