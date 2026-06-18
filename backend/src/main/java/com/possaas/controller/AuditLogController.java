package com.possaas.controller;

import com.possaas.domain.audit.AuditLog;
import com.possaas.service.audit.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Audit Logs", description = "Audit log management APIs")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_STORE_ADMIN', 'ROLE_SUPER_ADMIN')")
    @Operation(summary = "Get audit logs", description = "Retrieve a paginated list of audit logs for the current tenant. Accessible by STORE_ADMIN.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Logs retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<Page<AuditLog>> getAuditLogs(
            @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME)
            @org.springframework.web.bind.annotation.RequestParam(required = false) java.time.LocalDateTime startDate,
            @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME)
            @org.springframework.web.bind.annotation.RequestParam(required = false) java.time.LocalDateTime endDate,
            @ParameterObject Pageable pageable) {
        return ResponseEntity.ok(auditLogService.getLogsForTenant(startDate, endDate, pageable));
    }

    @GetMapping("/export/csv")
    @PreAuthorize("hasAnyAuthority('ROLE_STORE_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<byte[]> exportAuditLogsCsv(
            @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME)
            @RequestParam(required = false) java.time.LocalDateTime startDate,
            @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME)
            @RequestParam(required = false) java.time.LocalDateTime endDate,
            @RequestParam(required = false) String search) {
        byte[] content = auditLogService.exportLogsCsv(startDate, endDate, search);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        headers.setContentDisposition(ContentDisposition.attachment().filename("audit_logs.csv").build());

        return new ResponseEntity<>(content, headers, HttpStatus.OK);
    }

    @GetMapping("/export/pdf")
    @PreAuthorize("hasAnyAuthority('ROLE_STORE_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<byte[]> exportAuditLogsPdf(
            @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME)
            @RequestParam(required = false) java.time.LocalDateTime startDate,
            @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME)
            @RequestParam(required = false) java.time.LocalDateTime endDate,
            @RequestParam(required = false) String search) {
        byte[] content = auditLogService.exportLogsPdf(startDate, endDate, search);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment().filename("audit_logs.pdf").build());

        return new ResponseEntity<>(content, headers, HttpStatus.OK);
    }
}
