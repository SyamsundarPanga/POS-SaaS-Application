// Error Handling Utilities

export interface APIError {
  status: number;
  message: string;
  errors?: Record<string, string[]>; // Validation errors
  timestamp: string;
}

/**
 * Handles API errors and returns user-friendly error messages
 */
export const handleAPIError = (error: any): string => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return data.message || 'Invalid request. Please check your input.';
      case 401:
        return 'Your session has expired. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return data.message || 'A conflict occurred. Please try again.';
      case 422:
        // Validation errors
        if (data.errors) {
          return Object.values(data.errors).flat().join(', ');
        }
        return data.message || 'Validation failed.';
      case 500:
        return 'An internal server error occurred. Please try again later.';
      default:
        return data.message || 'An unexpected error occurred.';
    }
  } else if (error.request) {
    // Request made but no response
    return 'Network error. Please check your connection and try again.';
  } else {
    // Something else happened
    return error.message || 'An unexpected error occurred.';
  }
};

/**
 * Request deduplication utility
 */
const pendingRequests = new Map<string, Promise<any>>();

export const deduplicatedRequest = async <T,>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> => {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  const promise = requestFn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
};
