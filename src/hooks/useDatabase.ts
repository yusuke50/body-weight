import { useEffect, useState } from 'react';
import { initDatabase } from '../services/database';

interface UseDatabaseReturn {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * 数据库初始化 Hook
 * @returns 数据库状态
 */
export function useDatabase(): UseDatabaseReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true);
        await initDatabase();
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('数据库初始化失败'));
        setIsInitialized(false);
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  return {
    isInitialized,
    isLoading,
    error,
  };
}
