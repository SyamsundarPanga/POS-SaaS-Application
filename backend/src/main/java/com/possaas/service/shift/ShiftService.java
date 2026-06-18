package com.possaas.service.shift;

import com.possaas.config.TenantContext;
import com.possaas.domain.order.Order;
import com.possaas.domain.payment.Payment;
import com.possaas.domain.payment.PaymentStatus;
import com.possaas.domain.user.Shift;
import com.possaas.domain.user.User;
import com.possaas.domain.user.Role;
import com.possaas.exception.ResourceNotFoundException;
import com.possaas.dto.request.CloseShiftRequest;
import com.possaas.dto.request.OpenShiftRequest;
import com.possaas.dto.response.ShiftReportResponse;
import com.possaas.dto.response.ShiftResponse;
import com.possaas.repository.OrderRepository;
import com.possaas.repository.ShiftRepository;
import com.possaas.repository.UserRepository;
import com.possaas.service.audit.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ShiftService {

    private final ShiftRepository shiftRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final AuditLogService auditLogService;

    /**
     * Get current user
     */
    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        String tenantId = TenantContext.getTenantId();
        if (tenantId != null) {
            return userRepository.findByUsernameAndTenantId(username, tenantId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
        }
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    /**
     * Open new shift
     */
    @Transactional
    public ShiftResponse openShift(OpenShiftRequest request) {

        User user = getCurrentUser();

        // ✅ Check user has branch assigned (unless Store Admin provides override)
        Long targetBranchId = request.getBranchId();
        
        if (targetBranchId != null) {
            if (user.getRole() != Role.ROLE_STORE_ADMIN) {
                throw new RuntimeException("Only Store Admins can specify a branch for shift opening.");
            }
            // Optional: Validate branch exists and belongs to the same tenant
            // Branch branch = branchRepository.findByIdAndTenantId(targetBranchId, user.getTenantId())
            //        .orElseThrow(() -> new RuntimeException("Invalid branch selected"));
        } else {
            if (user.getBranch() == null || user.getBranch().getId() == null) {
                throw new RuntimeException("User is not assigned to any branch. Please contact admin.");
            }
            targetBranchId = user.getBranch().getId();
        }

        // ✅ Check if user already has an open shift (across any branch)
        shiftRepository.findCurrentShiftByEmployee(user.getId())
                .ifPresent(shift -> {
                    throw new RuntimeException("You already have an open shift. Please close it first.");
                });

        Shift shift = new Shift();
        shift.setEmployee(user);
        shift.setBranchId(targetBranchId);
        shift.setShiftStart(LocalDateTime.now());
        shift.setStartingCash(request.getStartingCash());
        shift.setStatus("OPEN");
        shift.setNotes(request.getNotes());

        Shift saved = shiftRepository.save(shift);
        auditLogService.log(
                "SHIFT_OPENED",
                "SHIFT",
                saved.getId().toString(),
                String.format("Opened shift for user %s at branch %d with starting cash %s",
                        user.getUsername(),
                        targetBranchId,
                        request.getStartingCash()));

        log.info("Shift opened for user {} at branch {}", user.getUsername(), targetBranchId);

        return convertToDto(saved);
    }

    /**
     * Close current shift
     */
    @Transactional
    public ShiftReportResponse closeShift(CloseShiftRequest request) {
        User user = getCurrentUser();
        
        Shift shift = shiftRepository.findCurrentShiftByEmployee(user.getId())
        		.orElseThrow(() -> new ResourceNotFoundException("No active shift found"));
        
        shift.setShiftEnd(LocalDateTime.now());
        shift.setFinalCash(request.getFinalCash());
        shift.setStatus("CLOSED");
        if (request.getNotes() != null && !request.getNotes().isBlank()) {
            String existingNotes = shift.getNotes();
            shift.setNotes(existingNotes == null || existingNotes.isBlank()
                    ? request.getNotes()
                    : existingNotes + "\n" + request.getNotes());
        }
        
        Shift saved = shiftRepository.save(shift);
        auditLogService.log(
                "SHIFT_CLOSED",
                "SHIFT",
                saved.getId().toString(),
                String.format("Closed shift for user %s at branch %d with final cash %s",
                        user.getUsername(),
                        user.getBranch().getId(),
                        request.getFinalCash()));
        
        log.info("Shift closed for user {} at branch {}", user.getUsername(), user.getBranch().getId());
        
        return generateShiftReport(saved);
    }

    /**
     * Get current active shift
     */
    public ShiftResponse getCurrentShift() {
        User user = getCurrentUser();
        
        return shiftRepository.findCurrentShiftByEmployee(user.getId())
                .map(this::convertToDto)
                .orElse(null);
    }

    /**
     * Get shift history
     */
    public Page<ShiftResponse> getShiftHistory(
            Pageable pageable,
            String search,
            LocalDate startDate,
            LocalDate endDate) {
        User user = getCurrentUser();
        String tenantId = TenantContext.getTenantId();
        String normalizedSearch = search != null && !search.trim().isEmpty()
                ? search.trim().toLowerCase()
                : null;
        String searchPattern = normalizedSearch != null ? "%" + normalizedSearch + "%" : null;
        LocalDateTime startDateTime = startDate != null ? startDate.atStartOfDay() : null;
        LocalDateTime endDateTime = endDate != null ? endDate.atTime(23, 59, 59, 999_999_999) : null;

        if (user.getRole() == Role.ROLE_STORE_ADMIN) {
            return (searchPattern == null
                    ? shiftRepository.findShiftHistoryForTenantByDateRange(
                            tenantId,
                            startDateTime,
                            endDateTime,
                            pageable)
                    : shiftRepository.findShiftHistoryForTenantByDateRangeAndSearch(
                            tenantId,
                            searchPattern,
                            startDateTime,
                            endDateTime,
                            pageable))
                    .map(this::convertToDto);
        }

        if (user.getRole() == Role.ROLE_BRANCH_MANAGER) {
            if (user.getBranch() == null || user.getBranch().getId() == null) {
                throw new RuntimeException("Manager is not assigned to any branch.");
            }

            return (searchPattern == null
                    ? shiftRepository.findShiftHistoryForBranchByDateRange(
                            user.getBranch().getId(),
                            tenantId,
                            startDateTime,
                            endDateTime,
                            pageable)
                    : shiftRepository.findShiftHistoryForBranchByDateRangeAndSearch(
                            user.getBranch().getId(),
                            tenantId,
                            searchPattern,
                            startDateTime,
                            endDateTime,
                            pageable))
                    .map(this::convertToDto);
        }

        return (searchPattern == null
                ? shiftRepository.findShiftHistoryForCashierByDateRange(
                        user.getId(),
                        tenantId,
                        startDateTime,
                        endDateTime,
                        pageable)
                : shiftRepository.findShiftHistoryForCashierByDateRangeAndSearch(
                        user.getId(),
                        tenantId,
                        searchPattern,
                        startDateTime,
                        endDateTime,
                        pageable))
                .map(this::convertToDto);
    }

    /**
     * Get shift report
     */
    public ShiftReportResponse getShiftReport(Long shiftId) {
        User user = getCurrentUser();
        String tenantId = TenantContext.getTenantId();

        Shift shift = shiftRepository.findById(shiftId)
        		.orElseThrow(() -> new ResourceNotFoundException("Shift not found"));

        // Verify tenant
        if (shift.getTenantId() == null || tenantId == null || !shift.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Shift does not belong to your tenant");
        }

        if (user.getRole() == Role.ROLE_CASHIER) {
            if (shift.getEmployee() == null || !shift.getEmployee().getId().equals(user.getId())) {
                throw new RuntimeException("You can only access your own shift reports");
            }
        } else if (user.getRole() == Role.ROLE_BRANCH_MANAGER) {
            Long managerBranchId = user.getBranch() != null ? user.getBranch().getId() : null;
            if (managerBranchId == null || !managerBranchId.equals(shift.getBranchId())) {
                throw new RuntimeException("You can only access shift reports for your branch");
            }
        }

        return generateShiftReport(shift);
    }

    /**
     * Generate shift report
     */
    private ShiftReportResponse generateShiftReport(Shift shift) {
        String tenantId = TenantContext.getTenantId();
        
        // Get orders for this shift
        List<Order> orders = orderRepository.findByTenantIdAndBranchIdAndCreatedAtBetween(
                tenantId,
                shift.getBranchId(),
                shift.getShiftStart(),
                shift.getShiftEnd() != null ? shift.getShiftEnd() : LocalDateTime.now()
        );
        
        // Calculate totals
        int totalTransactions = orders.size();
        BigDecimal totalSales = orders.stream()
                .flatMap(order -> order.getPayments() == null ? java.util.stream.Stream.empty() : order.getPayments().stream())
                .filter(java.util.Objects::nonNull)
                .filter(payment -> payment.getStatus() != PaymentStatus.FAILED)
                .map(Payment::getAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Calculate payment breakdown
        Map<String, BigDecimal> paymentBreakdown = new HashMap<>();
        for (Order order : orders) {
            if (order.getPayments() != null) {
                for (Payment payment : order.getPayments()) {
                    if (payment == null || payment.getMethod() == null || payment.getAmount() == null
                            || payment.getStatus() == PaymentStatus.FAILED) {
                        continue;
                    }
                    String method = payment.getMethod().name();
                    BigDecimal amount = payment.getAmount();
                    paymentBreakdown.merge(method, amount, BigDecimal::add);
                }
            }
        }
        
        // Calculate expected cash (starting cash + cash payments)
        BigDecimal cashPayments = paymentBreakdown.getOrDefault("CASH", BigDecimal.ZERO);
        BigDecimal expectedCash = (shift.getStartingCash() == null ? BigDecimal.ZERO : shift.getStartingCash())
                .add(cashPayments);
        BigDecimal actualCash = shift.getFinalCash() != null ? shift.getFinalCash() : BigDecimal.ZERO;
        BigDecimal variance = actualCash.subtract(expectedCash);
        
        return ShiftReportResponse.builder()
                .shift(convertToDto(shift))
                .totalTransactions(totalTransactions)
                .totalSales(totalSales)
                .paymentBreakdown(paymentBreakdown)
                .expectedCash(expectedCash)
                .actualCash(actualCash)
                .variance(variance)
                .build();
    }

    /**
     * Convert Shift to ShiftResponse
     */
    private ShiftResponse convertToDto(Shift shift) {
        String employeeName = shift.getEmployee() != null && shift.getEmployee().getUsername() != null
                ? shift.getEmployee().getUsername()
                : "Unknown User";
        return ShiftResponse.builder()
                .id(shift.getId())
                .employeeId(shift.getEmployee() != null ? shift.getEmployee().getId() : null)
                .employeeName(employeeName)
                .branchId(shift.getBranchId())
                .branchName(null) // Can be populated if needed
                .shiftStart(shift.getShiftStart())
                .shiftEnd(shift.getShiftEnd())
                .startingCash(shift.getStartingCash())
                .finalCash(shift.getFinalCash())
                .status(shift.getStatus())
                .notes(shift.getNotes())
                .build();
    }
}
