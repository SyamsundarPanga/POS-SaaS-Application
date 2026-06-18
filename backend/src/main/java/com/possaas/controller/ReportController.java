package com.possaas.controller;

import com.possaas.dto.response.EmployeePerformanceResponse;
import com.possaas.dto.response.ImportResultResponse;
import com.possaas.dto.response.InventoryTurnoverResponse;
import com.possaas.dto.response.PaymentAuditLogResponse;
import com.possaas.dto.response.SalesReportResponse;
import com.possaas.service.admin.AdminReportService;
import com.possaas.service.manager.ManagerReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class ReportController {

    private final AdminReportService adminReportService;
    private final ManagerReportService managerReportService;

    // =====================
    // ADMIN REPORT ENDPOINTS
    // =====================

    @GetMapping("/api/admin/reports/inventory/turnover")
    @PreAuthorize("hasAnyAuthority('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    public ResponseEntity<List<InventoryTurnoverResponse>> getAdminInventoryTurnover(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(adminReportService.getInventoryTurnover(startDate, endDate));
    }

    @GetMapping("/api/admin/reports/inventory/export")
    @PreAuthorize("hasAnyAuthority('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    public ResponseEntity<byte[]> exportAdminInventory(
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        if ("pdf".equalsIgnoreCase(format)) {
            byte[] file = adminReportService.exportInventoryTurnoverPdf(startDate, endDate);
            return pdfResponse(file, "inventory_turnover.pdf");
        }
        byte[] file = adminReportService.exportInventoryTurnoverCsv(startDate, endDate);
        return csvResponse(file, "inventory_turnover.csv");
    }

    @PostMapping(value = "/api/admin/reports/inventory/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    public ResponseEntity<ImportResultResponse> importAdminInventory(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(adminReportService.importInventoryCsv(file));
    }

    @GetMapping("/api/admin/reports/users/employee-performance")
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    public ResponseEntity<List<EmployeePerformanceResponse>> getAdminEmployeePerformance(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(adminReportService.getEmployeePerformance(startDate, endDate, branchId));
    }

    @GetMapping("/api/admin/reports/users/export")
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    public ResponseEntity<byte[]> exportAdminUsers(
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        if ("pdf".equalsIgnoreCase(format)) {
            byte[] file = adminReportService.exportEmployeePerformancePdf(startDate, endDate, branchId);
            return pdfResponse(file, "employee_performance.pdf");
        }
        byte[] file = adminReportService.exportEmployeePerformanceCsv(startDate, endDate, branchId);
        return csvResponse(file, "employee_performance.csv");
    }

    @PostMapping(value = "/api/admin/reports/users/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    public ResponseEntity<ImportResultResponse> importAdminUsers(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(adminReportService.importUsersCsv(file));
    }

    @GetMapping("/api/admin/reports/sales")
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    public ResponseEntity<SalesReportResponse> getAdminSalesReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(adminReportService.getSalesReport(startDate, endDate));
    }

    @GetMapping("/api/admin/reports/payments/audit-log")
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    public ResponseEntity<List<PaymentAuditLogResponse>> getAdminPaymentAuditLog(
            @RequestParam(required = false) String method,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(adminReportService.getPaymentAuditLog(startDate, endDate, method, status));
    }

    @GetMapping("/api/admin/reports/orders/export")
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    public ResponseEntity<byte[]> exportAdminOrders(
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long branchId) {
        if ("pdf".equalsIgnoreCase(format)) {
            byte[] file = adminReportService.exportOrdersPdf(startDate, endDate, branchId);
            return pdfResponse(file, "sales_orders_report.pdf");
        }
        byte[] file = adminReportService.exportOrdersCsv(startDate, endDate, branchId);
        return csvResponse(file, "sales_orders_report.csv");
    }

    @GetMapping("/api/admin/reports/dashboard/export")
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    public ResponseEntity<byte[]> exportAdminDashboard(
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        if ("pdf".equalsIgnoreCase(format)) {
            byte[] file = adminReportService.exportDashboardPdf(startDate, endDate);
            return pdfResponse(file, "sales_dashboard_report.pdf");
        }
        byte[] file = adminReportService.exportDashboardCsv(startDate, endDate);
        return csvResponse(file, "sales_dashboard_report.csv");
    }

    @PostMapping(value = "/api/admin/reports/dashboard/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    public ResponseEntity<ImportResultResponse> importAdminDashboard(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(adminReportService.importDashboardCsv(file));
    }

    @GetMapping("/api/admin/reports/products/export")
    @PreAuthorize("hasAnyAuthority('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    public ResponseEntity<byte[]> exportAdminProducts(@RequestParam(defaultValue = "csv") String format) {
        if ("pdf".equalsIgnoreCase(format)) {
            byte[] file = adminReportService.exportProductsPdf();
            return pdfResponse(file, "products_catalog.pdf");
        }
        byte[] file = adminReportService.exportProductsCsv();
        return csvResponse(file, "products_catalog.csv");
    }

    @PostMapping(value = "/api/admin/reports/products/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    public ResponseEntity<ImportResultResponse> importAdminProducts(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false, defaultValue = "") String mapping) {
        return ResponseEntity.ok(adminReportService.importProductsCsv(file, mapping));
    }

    // =====================
    // MANAGER REPORT ENDPOINTS
    // =====================

    @GetMapping("/api/manager/reports/inventory/turnover")
    @PreAuthorize("hasAnyAuthority('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    public ResponseEntity<List<InventoryTurnoverResponse>> getManagerInventoryTurnover(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(managerReportService.getInventoryTurnover(startDate, endDate));
    }

    @GetMapping("/api/manager/reports/inventory/export")
    @PreAuthorize("hasAnyAuthority('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    public ResponseEntity<byte[]> exportManagerInventory(
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        if ("pdf".equalsIgnoreCase(format)) {
            byte[] file = managerReportService.exportInventoryTurnoverPdf(startDate, endDate);
            return pdfResponse(file, "manager_inventory_turnover.pdf");
        }
        byte[] file = managerReportService.exportInventoryTurnoverCsv(startDate, endDate);
        return csvResponse(file, "manager_inventory_turnover.csv");
    }

    @PostMapping(value = "/api/manager/reports/inventory/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    public ResponseEntity<ImportResultResponse> importManagerInventory(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(managerReportService.importInventoryCsv(file));
    }

    @GetMapping("/api/manager/reports/employees/performance")
    @PreAuthorize("hasAnyAuthority('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    public ResponseEntity<List<EmployeePerformanceResponse>> getManagerEmployeePerformance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(managerReportService.getEmployeePerformance(startDate, endDate));
    }

    @GetMapping("/api/manager/reports/employees/export")
    @PreAuthorize("hasAnyAuthority('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    public ResponseEntity<byte[]> exportManagerEmployees(
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        if ("pdf".equalsIgnoreCase(format)) {
            byte[] file = managerReportService.exportEmployeePerformancePdf(startDate, endDate);
            return pdfResponse(file, "manager_employee_performance.pdf");
        }
        byte[] file = managerReportService.exportEmployeePerformanceCsv(startDate, endDate);
        return csvResponse(file, "manager_employee_performance.csv");
    }

    @PostMapping(value = "/api/manager/reports/employees/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    public ResponseEntity<ImportResultResponse> importManagerEmployees(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(managerReportService.importEmployeesCsv(file));
    }

    @GetMapping("/api/manager/reports/sales")
    @PreAuthorize("hasAnyAuthority('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    public ResponseEntity<SalesReportResponse> getManagerSalesReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(managerReportService.getSalesReport(startDate, endDate));
    }

    @GetMapping("/api/manager/reports/payments/audit-log")
    @PreAuthorize("hasAnyAuthority('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    public ResponseEntity<List<PaymentAuditLogResponse>> getManagerPaymentAuditLog(
            @RequestParam(required = false) String method,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(managerReportService.getPaymentAuditLog(startDate, endDate, method, status));
    }

    @GetMapping("/api/manager/reports/dashboard/export")
    @PreAuthorize("hasAnyAuthority('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    public ResponseEntity<byte[]> exportManagerDashboard(
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        if ("pdf".equalsIgnoreCase(format)) {
            byte[] file = managerReportService.exportDashboardPdf(startDate, endDate);
            return pdfResponse(file, "manager_branch_sales_report.pdf");
        }
        byte[] file = managerReportService.exportDashboardCsv(startDate, endDate);
        return csvResponse(file, "manager_branch_sales_report.csv");
    }

    @PostMapping(value = "/api/manager/reports/dashboard/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    public ResponseEntity<ImportResultResponse> importManagerDashboard(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(managerReportService.importDashboardCsv(file));
    }

    private ResponseEntity<byte[]> csvResponse(byte[] file, String fileName) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        headers.setContentDisposition(ContentDisposition.attachment().filename(fileName).build());
        return ResponseEntity.ok().headers(headers).body(file);
    }

    private ResponseEntity<byte[]> pdfResponse(byte[] file, String fileName) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment().filename(fileName).build());
        return ResponseEntity.ok().headers(headers).body(file);
    }
}
