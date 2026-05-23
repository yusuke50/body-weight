import { useState } from 'react';
import { Layout } from './components/Layout/Layout';
import { Navigation } from './components/Layout/Navigation';
import { Dashboard } from './components/Dashboard/Dashboard';
import { BodyFatChart } from './components/Charts/BodyFatChart';
import { DataManagement } from './components/Settings/DataManagement';
import { useDatabase } from './hooks/useDatabase';
import { useRecords } from './hooks/useRecords';
import { Trash2, SquarePen, Save } from 'lucide-react';
import { formatDateTime } from './utils/dateUtils';

type View = 'dashboard' | 'charts' | 'data' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValues, setEditingValues] = useState({ weight: '', body_fat_percentage: '', muscle_mass: '', water_percentage: '' });
  const { isInitialized, isLoading: dbLoading, error: dbError } = useDatabase();
  const {
    records,
    filteredRecords,
    range,
    setRange,
    addRecord,
    updateRecord,
    deleteRecord,
    totalCount,
    latestRecord,
    previousRecord,
    refreshRecords,
    isLoading: recordsLoading,
  } = useRecords();

  if (dbLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在初始化資料庫...</p>
        </div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-600">
          <p className="text-xl font-semibold mb-2">資料庫初始化失敗</p>
          <p className="text-sm">{dbError.message}</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return null;
  }

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    setEditingValues({
      weight: record.weight.toString(),
      body_fat_percentage: record.body_fat_percentage?.toString() ?? '',
      muscle_mass: record.muscle_mass?.toString() ?? '',
      water_percentage: record.water_percentage?.toString() ?? '',
    });
  };

  const handleSave = async (record: any) => {
    await updateRecord(record.id, {
      weight: parseFloat(editingValues.weight),
      body_fat_percentage: editingValues.body_fat_percentage ? parseFloat(editingValues.body_fat_percentage) : undefined,
      muscle_mass: editingValues.muscle_mass ? parseFloat(editingValues.muscle_mass) : undefined,
      water_percentage: editingValues.water_percentage ? parseFloat(editingValues.water_percentage) : undefined,
    });
    setEditingId(null);
  };

  return (
    <Layout>
      <Navigation currentView={currentView} onViewChange={setCurrentView} />

      <div className="mt-6">
        {currentView === 'dashboard' && (
          <Dashboard
            latestRecord={latestRecord}
            previousRecord={previousRecord}
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
                💡 提示：更多圖表（總體重、筋肉量、身體含水量等）即將推出！
              </p>
            </div>
          </div>
        )}

        {currentView === 'data' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">記錄列表</h2>
            <p className="text-gray-600 mb-4">總共 {totalCount} 筆記錄</p>

            {records.length > 0 ? (
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
                        筋肉量
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        含水量
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record) => {
                      const isEditing = editingId === record.id;
                      return (
                        <tr key={record.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDateTime(record.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editingValues.weight}
                                onChange={(e) => setEditingValues({ ...editingValues, weight: e.target.value })}
                                className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                              />
                            ) : (
                              `${record.weight} kg`
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editingValues.body_fat_percentage}
                                onChange={(e) => setEditingValues({ ...editingValues, body_fat_percentage: e.target.value })}
                                className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                              />
                            ) : (
                              record.body_fat_percentage ? `${record.body_fat_percentage}%` : '-'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editingValues.muscle_mass}
                                onChange={(e) => setEditingValues({ ...editingValues, muscle_mass: e.target.value })}
                                className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                              />
                            ) : (
                              record.muscle_mass ? `${record.muscle_mass} kg` : '-'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editingValues.water_percentage}
                                onChange={(e) => setEditingValues({ ...editingValues, water_percentage: e.target.value })}
                                className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                              />
                            ) : (
                              record.water_percentage ? `${record.water_percentage}%` : '-'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {isEditing ? (
                              <button
                                onClick={() => handleSave(record)}
                                className="text-green-500 hover:text-green-700 mr-4"
                              >
                                <Save />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEdit(record)}
                                className="text-blue-500 hover:text-blue-700 mr-4"
                              >
                                <SquarePen />
                              </button>
                            )}
                            <button
                              onClick={() => record.id !== undefined && deleteRecord(record.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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
