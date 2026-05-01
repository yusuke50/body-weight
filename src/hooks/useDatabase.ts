import { useEffect, useState } from 'react';
import { initDatabase } from '../services/database';

interface UseDatabaseReturn {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * init database and return the status of the database
 * @returns status of the database
 * @example
 * const { isInitialized, isLoading, error } = useDatabase();
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
        setError(
          err instanceof Error ? err : new Error('initialization failed'),
        );
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
