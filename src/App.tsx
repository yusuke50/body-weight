import { useState } from 'react';
import { Layout } from './components/Layout/Layout';
import { Navigation } from './components/Layout/Navigation';
import { Dashboard } from './components/Dashboard/Dashboard';
import { BodyFatChart } from './components/Charts/BodyFatChart';
import { DataManagement } from './components/Settings/DataManagement';
import { useDatabase } from './hooks/useDatabase';
import { useRecords } from './hooks/useRecords';

type View = 'dashboard' | 'charts' | 'data' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const { isInitialized, isLoading: dbLoading, error: dbError } = useDatabase();
  const {
    filteredRecords,
    range,
    setRange,
    addRecord,
    totalCount,
    latestRecord,
    firstRecord,
    refreshRecords,
    isLoading: recordsLoading,
  } = useRecords();

  // 数据库初始化状态
  if (dbLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在初始化數據庫...</p>
        </div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-600">
          <p className="text-xl font-semibold mb-2">數據庫初始化失敗</p>
          <p className="text-sm">{dbError.message}</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return null;
  }

  return (
    <Layout>
      <Navigation currentView={currentView} onViewChange={setCurrentView} />

      <div className="mt-6">
        {currentView === 'dashboard' && (
          <Dashboard
            latestRecord={latestRecord}
            firstRecord={firstRecord}
            totalCount={totalCount}
            onAddRecord={addRecord}
          />
        )}

        {currentView === 'charts' && (
          <div className="space-y-6">
            <BodyFatChart
              records={filteredRecords}
              range={range}
              onRangeChange={setRange}
            />
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                💡 提示：更多圖表（總體重、肌肉量、含水量等）即將推出！
              </p>
            </div>
          </div>
        )}

        {currentView === 'data' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">數據列表</h2>
            <p className="text-gray-600 mb-4">總共 {totalCount} 筆記錄</p>

            {filteredRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        日期
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        體重
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        體脂率
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        肌肉量
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        含水量
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.weight} kg
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.body_fat_percentage ? `${record.body_fat_percentage}%` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.muscle_mass ? `${record.muscle_mass} kg` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.water_percentage ? `${record.water_percentage}%` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">暫無記錄</p>
            )}
          </div>
        )}

        {currentView === 'settings' && (
          <DataManagement onDataImported={refreshRecords} />
        )}
      </div>
    </Layout>
  );
}

export default App;
