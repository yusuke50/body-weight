import { useState, useEffect, useCallback } from 'react';
import { getSetting, setSetting } from '../services/dataService';

interface UseProfileReturn {
  height: number | null;
  updateHeight: (value: number | null) => void;
  isLoading: boolean;
}

const HEIGHT_KEY = 'height';

export function useProfile(): UseProfileReturn {
  const [height, setHeight] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(() => {
    setIsLoading(true);
    try {
      const raw = getSetting(HEIGHT_KEY);
      if (raw === null || raw === '') {
        setHeight(null);
      } else {
        const parsed =
          typeof raw === 'string' ? parseFloat(JSON.parse(raw)) : parseFloat(raw);
        setHeight(Number.isFinite(parsed) ? parsed : null);
      }
    } catch (error) {
      console.error('Failed to load profile: ', error);
      setHeight(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateHeight = useCallback((value: number | null) => {
    if (value === null || !Number.isFinite(value)) {
      setSetting(HEIGHT_KEY, JSON.stringify(null));
      setHeight(null);
      return;
    }
    setSetting(HEIGHT_KEY, JSON.stringify(value));
    setHeight(value);
  }, []);

  return { height, updateHeight, isLoading };
}
