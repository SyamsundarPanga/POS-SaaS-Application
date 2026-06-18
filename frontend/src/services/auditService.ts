import api from './api';

export interface AuditLog {
    id: number;
    userId: number | null;
    username: string;
    action: string;
    resource: string;
    resourceId: string;
    branchId?: number | null;
    branchName?: string | null;
    details: string;
    ipAddress: string;
    tenantId: string;
    createdAt: string;
}

export interface AuditLogResponse {
    content: AuditLog[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
}

const auditService = {
    getAuditLogs: (page = 0, size = 20, startDate?: string, endDate?: string, sort = 'createdAt,desc') => {
        return api.get<AuditLogResponse>('/audit-logs', {
            params: { page, size, startDate, endDate, sort }
        });
    },

    exportAuditLogsCsv: (startDate?: string, endDate?: string, search?: string) => {
        return api.get('/audit-logs/export/csv', {
            params: { startDate, endDate, search },
            responseType: 'blob'
        });
    },

    exportAuditLogsPdf: (startDate?: string, endDate?: string, search?: string) => {
        return api.get('/audit-logs/export/pdf', {
            params: { startDate, endDate, search },
            responseType: 'blob'
        });
    }
};

export default auditService;
