package com.possaas.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "Request object for generating reports")
public class ReportRequest {

    @Schema(description = "Report type", example = "SALES", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "Report type is required")
    private ReportType reportType;

    @Schema(description = "Start date for report", example = "2026-02-01T00:00:00")
    private LocalDateTime startDate;

    @Schema(description = "End date for report", example = "2026-02-28T23:59:59")
    private LocalDateTime endDate;

    @Schema(description = "Branch ID (optional, for branch-specific reports)", example = "1")
    private Long branchId;

    @Schema(description = "Export format", example = "PDF")
    private ExportFormat exportFormat;

    public enum ReportType {
        SALES,
        INVENTORY,
        EMPLOYEES,
        CUSTOMERS,
        FINANCIAL,
        TAX
    }

    public enum ExportFormat {
        PDF,
        CSV,
        EXCEL
    }
}
