import { useState, useCallback } from 'react';
import { LoadingContext } from './LoadingContext';

export function LoadingProvider({ children }) {
  const [loadingCount, setLoadingCount] = useState(0);

  const startLoading = useCallback(() => {
    setLoadingCount((c) => c + 1);
  }, []);

  const stopLoading = useCallback(() => {
    setLoadingCount((c) => Math.max(0, c - 1));
  }, []);

  const loadingFetch = useCallback(async (...args) => {
    startLoading();
    try {
      const res = await fetch(...args);
      return res;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  const contextValue = {
    isLoading: loadingCount > 0,
    startLoading,
    stopLoading,
    loadingFetch,
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      {loadingCount > 0 && (
        <div className="loading-indicator" aria-live="polite">
          <div className="loading-spinner"></div>
          <span>Loading...</span>
        </div>
      )}
    </LoadingContext.Provider>
  );
}
