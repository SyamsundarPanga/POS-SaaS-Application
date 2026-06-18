import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
  immediate?: boolean; // Execute immediately on mount
}

/**
 * Custom hook for polling data at regular intervals
 * @param callback - Function to execute on each poll
 * @param options - Polling configuration options
 */
export const usePolling = (
  callback: () => void | Promise<void>,
  options: UsePollingOptions = {}
) => {
  const { enabled = true, interval = 30000, immediate = true } = options;
  const savedCallback = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update callback ref when it changes
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      savedCallback.current();
    }, interval);
  }, [interval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopPolling();
      return;
    }

    // Execute immediately if requested
    if (immediate) {
      savedCallback.current();
    }

    // Start polling
    startPolling();

    // Cleanup on unmount or when dependencies change
    return () => {
      stopPolling();
    };
  }, [enabled, immediate, startPolling, stopPolling]);

  return {
    startPolling,
    stopPolling,
  };
};

export default usePolling;
