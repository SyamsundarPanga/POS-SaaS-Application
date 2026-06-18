package com.possaas.controller;

import com.possaas.dto.request.CloseShiftRequest;
import com.possaas.dto.request.OpenShiftRequest;
import com.possaas.dto.response.ShiftReportResponse;
import com.possaas.dto.response.ShiftResponse;
import com.possaas.service.shift.ShiftService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/shifts")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('CASHIER', 'BRANCH_MANAGER', 'STORE_ADMIN')")
@Tag(name = "Shifts", description = "Cashier shift management")
public class ShiftController {

    private final ShiftService shiftService;

    @PostMapping("/open")
    @Operation(summary = "Open new shift")
    public ResponseEntity<ShiftResponse> openShift(
            @Valid @RequestBody OpenShiftRequest request) {
        return ResponseEntity.ok(shiftService.openShift(request));
    }

    @PostMapping("/close")
    @Operation(summary = "Close current shift")
    public ResponseEntity<ShiftReportResponse> closeShift(
            @Valid @RequestBody CloseShiftRequest request) {
        return ResponseEntity.ok(shiftService.closeShift(request));
    }

    @GetMapping("/current")
    @Operation(summary = "Get current active shift")
    public ResponseEntity<ShiftResponse> getCurrentShift() {
        return ResponseEntity.ok(shiftService.getCurrentShift());
    }

    @GetMapping("/history")
    @Operation(summary = "Get shift history")
    public ResponseEntity<Page<ShiftResponse>> getShiftHistory(
            Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate) {
        return ResponseEntity.ok(shiftService.getShiftHistory(pageable, search, startDate, endDate));
    }

    @GetMapping("/{id}/report")
    @Operation(summary = "Get shift report")
    public ResponseEntity<ShiftReportResponse> getShiftReport(@PathVariable Long id) {
        return ResponseEntity.ok(shiftService.getShiftReport(id));
    }
}
