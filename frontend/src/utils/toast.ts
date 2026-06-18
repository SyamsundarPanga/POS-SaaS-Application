import { toast as toastify, ToastOptions, Id } from 'react-toastify';

const defaultOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

/**
 * Show a success toast notification
 */
export const showSuccess = (message: string, options?: ToastOptions): Id => {
  return toastify.success(message, {
    ...defaultOptions,
    ...options,
    className: 'toast-success',
  });
};

/**
 * Show an error toast notification
 */
export const showError = (message: string, options?: ToastOptions): Id => {
  return toastify.error(message, {
    ...defaultOptions,
    ...options,
    className: 'toast-error',
  });
};

/**
 * Show a warning toast notification
 */
export const showWarning = (message: string, options?: ToastOptions): Id => {
  return toastify.warning(message, {
    ...defaultOptions,
    ...options,
    className: 'toast-warning',
  });
};

/**
 * Show an info toast notification
 */
export const showInfo = (message: string, options?: ToastOptions): Id => {
  return toastify.info(message, {
    ...defaultOptions,
    ...options,
    className: 'toast-info',
  });
};

/**
 * Show a toast with a custom action button
 */
export const showWithAction = (
  message: string,
  actionLabel: string,
  onAction: () => void,
  options?: ToastOptions,
): Id => {
  return toastify(message, {
    ...defaultOptions,
    ...options,
  });
};

/**
 * Show a loading toast that can be updated
 */
export const showLoading = (message: string): Id => {
  return toastify.loading(message, {
    ...defaultOptions,
    autoClose: false,
  });
};

/**
 * Update an existing toast
 */
export const updateToast = (
  toastId: Id,
  message: string,
  type: 'success' | 'error' | 'warning' | 'info',
  options?: ToastOptions,
): void => {
  toastify.update(toastId, {
    render: message,
    type,
    isLoading: false,
    autoClose: 5000,
    ...options,
  });
};

/**
 * Dismiss a specific toast
 */
export const dismissToast = (toastId: Id): void => {
  toastify.dismiss(toastId);
};

/**
 * Dismiss all toasts
 */
export const dismissAllToasts = (): void => {
  toastify.dismiss();
};

// Export all toast functions
export const toast = {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  withAction: showWithAction,
  loading: showLoading,
  update: updateToast,
  dismiss: dismissToast,
  dismissAll: dismissAllToasts,
};

export default toast;
