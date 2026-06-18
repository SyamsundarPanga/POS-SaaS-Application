/**
 * Shift Management Service
 * 
 * Handles all cashier shift operations including:
 * - Opening shifts with starting cash
 * - Closing shifts with final cash count
 * - Shift reporting and analytics
 * - Cash variance tracking
 * - Shift history management
 * 
 * @module shiftService
 */

import api from "./api";

// ============================================
// TYPE DEFINITIONS
// ============================================

export enum ShiftStatus {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
}

export interface OpenShiftRequest {
  startingCash: number;
  notes?: string;
}

export interface CloseShiftRequest {
  finalCash: number;
  notes?: string;
}

export interface ShiftResponse {
  id: number;
  employeeId: number;
  employeeName: string;
  branchId: number;
  branchName: string;
  shiftStart: string;
  shiftEnd?: string;
  startingCash: number;
  finalCash?: number;
  status: ShiftStatus;
  notes?: string;
}

export interface PaymentBreakdown {
  [method: string]: number;
}

export interface ShiftReportResponse {
  shift: ShiftResponse;
  totalTransactions: number;
  totalSales: number;
  paymentBreakdown: PaymentBreakdown;
  expectedCash: number;
  actualCash: number;
  variance: number;
}

export interface ShiftHistoryParams {
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ShiftSummary {
  totalShifts: number;
  totalSales: number;
  averageSalesPerShift: number;
  totalVariance: number;
  shiftsWithVariance: number;
}

// ============================================
// SHIFT SERVICE
// ============================================

const shiftService = {
  // ==========================================
  // SHIFT LIFECYCLE MANAGEMENT
  // ==========================================

  /**
   * Open a new shift
   * 
   * @param startingCash - Starting cash amount in drawer
   * @param notes - Optional notes about shift opening
   * @returns Promise with shift details
   * @throws Error if shift already open or validation fails
   */
  openShift: async (
    startingCash: number,
    notes?: string,
    branchId?: number
  ): Promise<ShiftResponse> => {
    if (startingCash < 0) {
      throw new Error("Starting cash cannot be negative");
    }

    const request = {
      startingCash,
      notes,
      branchId,
    };

    try {
      const response = await api.post<ShiftResponse>("/shifts/open", request);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(
          error.response.data.message || "Cannot open shift. You may already have an active shift."
        );
      }
      throw error;
    }
  },

  /**
   * Close the current shift
   * 
   * @param finalCash - Final cash amount in drawer
   * @param notes - Optional notes about shift closing
   * @returns Promise with shift report including variance
   * @throws Error if no active shift or validation fails
   */
  closeShift: async (
    finalCash: number,
    notes?: string
  ): Promise<ShiftReportResponse> => {
    if (finalCash < 0) {
      throw new Error("Final cash cannot be negative");
    }

    const request: CloseShiftRequest = {
      finalCash,
      notes,
    };

    try {
      const response = await api.post<ShiftReportResponse>(
        "/shifts/close",
        request
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(
          error.response.data.message || "Cannot close shift. No active shift found."
        );
      }
      throw error;
    }
  },

  // ==========================================
  // SHIFT RETRIEVAL
  // ==========================================

  /**
   * Get current active shift
   * 
   * @returns Promise with current shift details or null if no active shift
   */
  getCurrentShift: async (): Promise<ShiftResponse | null> => {
    try {
      const response = await api.get<ShiftResponse>("/shifts/current");
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // No active shift
      }
      throw error;
    }
  },

  /**
   * Check if user has an active shift
   * 
   * @returns Promise with boolean indicating if shift is active
   */
  hasActiveShift: async (): Promise<boolean> => {
    try {
      const shift = await shiftService.getCurrentShift();
      return shift !== null && shift.status === ShiftStatus.OPEN;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get shift history with pagination
   * 
   * @param params - Pagination and sorting parameters
   * @returns Promise with paginated shift history
   */
  getShiftHistory: async (
    params?: ShiftHistoryParams
  ): Promise<PageResponse<ShiftResponse>> => {
    const queryParams = {
      page: params?.page || 0,
      size: params?.size || 10,
      sort: params?.sort || "shiftStart,desc",
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.startDate ? { startDate: params.startDate } : {}),
      ...(params?.endDate ? { endDate: params.endDate } : {}),
    };

    const response = await api.get<PageResponse<ShiftResponse>>(
      "/shifts/history",
      { params: queryParams }
    );
    return response.data;
  },

  /**
   * Get shift report by ID
   * 
   * @param shiftId - Shift ID
   * @returns Promise with detailed shift report
   */
  getShiftReport: async (shiftId: number): Promise<ShiftReportResponse> => {
    const response = await api.get<ShiftReportResponse>(
      `/shifts/${shiftId}/report`
    );
    return response.data;
  },

  // ==========================================
  // SHIFT ANALYTICS
  // ==========================================

  /**
   * Calculate shift duration in hours
   * 
   * @param shift - Shift object
   * @returns Duration in hours
   */
  calculateShiftDuration: (shift: ShiftResponse): number => {
    if (!shift.shiftEnd) {
      const now = new Date();
      const start = new Date(shift.shiftStart);
      return (now.getTime() - start.getTime()) / (1000 * 60 * 60);
    }

    const start = new Date(shift.shiftStart);
    const end = new Date(shift.shiftEnd);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  },

  /**
   * Calculate cash variance
   * 
   * @param expectedCash - Expected cash amount
   * @param actualCash - Actual cash counted
   * @returns Variance amount (positive = overage, negative = shortage)
   */
  calculateVariance: (expectedCash: number, actualCash: number): number => {
    return actualCash - expectedCash;
  },

  /**
   * Calculate variance percentage
   * 
   * @param variance - Variance amount
   * @param expectedCash - Expected cash amount
   * @returns Variance percentage
   */
  calculateVariancePercentage: (
    variance: number,
    expectedCash: number
  ): number => {
    if (expectedCash === 0) return 0;
    return (variance / expectedCash) * 100;
  },

  /**
   * Check if variance is within acceptable range
   * 
   * @param variance - Variance amount
   * @param threshold - Acceptable variance threshold (default: 10)
   * @returns True if variance is acceptable
   */
  isVarianceAcceptable: (variance: number, threshold: number = 10): boolean => {
    return Math.abs(variance) <= threshold;
  },

  /**
   * Get variance status
   * 
   * @param variance - Variance amount
   * @returns Status string (EXACT, OVERAGE, SHORTAGE)
   */
  getVarianceStatus: (variance: number): string => {
    if (variance === 0) return "EXACT";
    if (variance > 0) return "OVERAGE";
    return "SHORTAGE";
  },

  /**
   * Calculate shift summary statistics
   * 
   * @param shifts - Array of shift reports
   * @returns Summary statistics
   */
  calculateShiftSummary: (
    shifts: ShiftReportResponse[]
  ): ShiftSummary => {
    const totalShifts = shifts.length;
    const totalSales = shifts.reduce(
      (sum, shift) => sum + shift.totalSales,
      0
    );
    const totalVariance = shifts.reduce(
      (sum, shift) => sum + Math.abs(shift.variance),
      0
    );
    const shiftsWithVariance = shifts.filter(
      (shift) => shift.variance !== 0
    ).length;

    return {
      totalShifts,
      totalSales,
      averageSalesPerShift: totalShifts > 0 ? totalSales / totalShifts : 0,
      totalVariance,
      shiftsWithVariance,
    };
  },

  // ==========================================
  // SHIFT VALIDATION
  // ==========================================

  /**
   * Validate starting cash amount
   * 
   * @param amount - Starting cash amount
   * @returns Validation result
   */
  validateStartingCash: (amount: number): { valid: boolean; error?: string } => {
    if (amount < 0) {
      return { valid: false, error: "Starting cash cannot be negative" };
    }
    if (amount > 100000) {
      return {
        valid: false,
        error: "Starting cash amount seems unusually high",
      };
    }
    return { valid: true };
  },

  /**
   * Validate final cash amount
   * 
   * @param amount - Final cash amount
   * @param startingCash - Starting cash amount
   * @returns Validation result
   */
  validateFinalCash: (
    amount: number,
    startingCash: number
  ): { valid: boolean; error?: string } => {
    if (amount < 0) {
      return { valid: false, error: "Final cash cannot be negative" };
    }
    if (amount < startingCash * 0.5) {
      return {
        valid: false,
        error: "Final cash is significantly lower than starting cash. Please verify.",
      };
    }
    return { valid: true };
  },

  // ==========================================
  // FORMATTING UTILITIES
  // ==========================================

  /**
   * Format currency amount
   * 
   * @param amount - Amount to format
   * @param currency - Currency code (default: INR)
   * @returns Formatted currency string
   */
  formatCurrency: (amount: number, currency: string = "INR"): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
    }).format(amount);
  },

  /**
   * Format shift duration
   * 
   * @param hours - Duration in hours
   * @returns Formatted duration string
   */
  formatDuration: (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  },

  /**
   * Format date and time
   * 
   * @param dateString - ISO date string
   * @returns Formatted date and time
   */
  formatDateTime: (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  },

  /**
   * Format date only
   * 
   * @param dateString - ISO date string
   * @returns Formatted date
   */
  formatDate: (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  },

  /**
   * Format time only
   * 
   * @param dateString - ISO date string
   * @returns Formatted time
   */
  formatTime: (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  },

  // ==========================================
  // SHIFT REPORTING
  // ==========================================

  /**
   * Generate shift summary text
   * 
   * @param report - Shift report
   * @returns Summary text
   */
  generateShiftSummary: (report: ShiftReportResponse): string => {
    const { shift, totalTransactions, totalSales, variance } = report;
    const duration = shiftService.calculateShiftDuration(shift);
    const varianceStatus = shiftService.getVarianceStatus(variance);

    return `
Shift Summary for ${shift.employeeName}
Duration: ${shiftService.formatDuration(duration)}
Transactions: ${totalTransactions}
Total Sales: ${shiftService.formatCurrency(totalSales)}
Cash Variance: ${shiftService.formatCurrency(Math.abs(variance))} (${varianceStatus})
    `.trim();
  },

  /**
   * Export shift report to CSV format
   * 
   * @param report - Shift report
   * @returns CSV string
   */
  exportShiftReportToCSV: (report: ShiftReportResponse): string => {
    const { shift, totalTransactions, totalSales, expectedCash, actualCash, variance } = report;
    
    const headers = [
      "Shift ID",
      "Employee",
      "Branch",
      "Start Time",
      "End Time",
      "Starting Cash",
      "Final Cash",
      "Transactions",
      "Total Sales",
      "Expected Cash",
      "Actual Cash",
      "Variance",
    ];

    const values = [
      shift.id,
      shift.employeeName,
      shift.branchName,
      shift.shiftStart,
      shift.shiftEnd || "N/A",
      shift.startingCash,
      shift.finalCash || "N/A",
      totalTransactions,
      totalSales,
      expectedCash,
      actualCash,
      variance,
    ];

    return `${headers.join(",")}\n${values.join(",")}`;
  },

  /**
   * Download shift report as CSV file
   * 
   * @param report - Shift report
   * @param filename - Optional filename
   */
  downloadShiftReport: (
    report: ShiftReportResponse,
    filename?: string
  ): void => {
    const csv = shiftService.exportShiftReportToCSV(report);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `shift_report_${report.shift.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // ==========================================
  // SHIFT NOTIFICATIONS
  // ==========================================

  /**
   * Check if shift duration exceeds threshold
   * 
   * @param shift - Shift object
   * @param maxHours - Maximum shift hours (default: 8)
   * @returns True if shift is too long
   */
  isShiftTooLong: (shift: ShiftResponse, maxHours: number = 8): boolean => {
    const duration = shiftService.calculateShiftDuration(shift);
    return duration > maxHours;
  },

  /**
   * Get shift warning messages
   * 
   * @param shift - Shift object
   * @returns Array of warning messages
   */
  getShiftWarnings: (shift: ShiftResponse): string[] => {
    const warnings: string[] = [];

    if (shiftService.isShiftTooLong(shift)) {
      warnings.push("Shift duration exceeds 8 hours");
    }

    const duration = shiftService.calculateShiftDuration(shift);
    if (duration > 12) {
      warnings.push("CRITICAL: Shift duration exceeds 12 hours");
    }

    return warnings;
  },
};

export default shiftService;
