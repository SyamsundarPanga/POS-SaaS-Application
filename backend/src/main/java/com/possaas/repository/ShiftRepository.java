package com.possaas.repository;

import com.possaas.domain.user.Shift;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface ShiftRepository extends JpaRepository<Shift, Long> {

    @Query("SELECT s FROM Shift s WHERE s.employee.id = :employeeId " +
            "AND s.status = 'OPEN' ORDER BY s.shiftStart DESC")
    Optional<Shift> findCurrentShiftByEmployee(@Param("employeeId") Long employeeId);

    Page<Shift> findByEmployeeIdAndTenantIdOrderByShiftStartDesc(
            Long employeeId, String tenantId, Pageable pageable);

    Page<Shift> findByBranchIdAndTenantIdOrderByShiftStartDesc(
            Long branchId, String tenantId, Pageable pageable);

    Page<Shift> findByTenantIdOrderByShiftStartDesc(String tenantId, Pageable pageable);

    @EntityGraph(attributePaths = "employee")
    @Query("""
            SELECT s
            FROM Shift s
            WHERE s.tenantId = :tenantId
              AND s.employee.id = :employeeId
              AND s.shiftStart >= :startDate
              AND s.shiftStart <= :endDate
            ORDER BY s.shiftStart DESC
            """)
    Page<Shift> findShiftHistoryForCashierByDateRange(
            @Param("employeeId") Long employeeId,
            @Param("tenantId") String tenantId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    @EntityGraph(attributePaths = "employee")
    @Query("""
            SELECT s
            FROM Shift s
            LEFT JOIN s.employee e
            WHERE s.tenantId = :tenantId
              AND s.employee.id = :employeeId
              AND s.shiftStart >= :startDate
              AND s.shiftStart <= :endDate
              AND (
                    LOWER(COALESCE(e.firstName, '')) LIKE :searchPattern
                    OR LOWER(COALESCE(e.lastName, '')) LIKE :searchPattern
                    OR LOWER(CONCAT(COALESCE(e.firstName, ''), ' ', COALESCE(e.lastName, ''))) LIKE :searchPattern
                    OR LOWER(COALESCE(e.username, '')) LIKE :searchPattern
                  )
            ORDER BY s.shiftStart DESC
            """)
    Page<Shift> findShiftHistoryForCashierByDateRangeAndSearch(
            @Param("employeeId") Long employeeId,
            @Param("tenantId") String tenantId,
            @Param("searchPattern") String searchPattern,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    @EntityGraph(attributePaths = "employee")
    @Query("""
            SELECT s
            FROM Shift s
            WHERE s.tenantId = :tenantId
              AND s.branchId = :branchId
              AND s.shiftStart >= :startDate
              AND s.shiftStart <= :endDate
            ORDER BY s.shiftStart DESC
            """)
    Page<Shift> findShiftHistoryForBranchByDateRange(
            @Param("branchId") Long branchId,
            @Param("tenantId") String tenantId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    @EntityGraph(attributePaths = "employee")
    @Query("""
            SELECT s
            FROM Shift s
            LEFT JOIN s.employee e
            WHERE s.tenantId = :tenantId
              AND s.branchId = :branchId
              AND s.shiftStart >= :startDate
              AND s.shiftStart <= :endDate
              AND (
                    LOWER(COALESCE(e.firstName, '')) LIKE :searchPattern
                    OR LOWER(COALESCE(e.lastName, '')) LIKE :searchPattern
                    OR LOWER(CONCAT(COALESCE(e.firstName, ''), ' ', COALESCE(e.lastName, ''))) LIKE :searchPattern
                    OR LOWER(COALESCE(e.username, '')) LIKE :searchPattern
                  )
            ORDER BY s.shiftStart DESC
            """)
    Page<Shift> findShiftHistoryForBranchByDateRangeAndSearch(
            @Param("branchId") Long branchId,
            @Param("tenantId") String tenantId,
            @Param("searchPattern") String searchPattern,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    @EntityGraph(attributePaths = "employee")
    @Query("""
            SELECT s
            FROM Shift s
            WHERE s.tenantId = :tenantId
              AND s.shiftStart >= :startDate
              AND s.shiftStart <= :endDate
            ORDER BY s.shiftStart DESC
            """)
    Page<Shift> findShiftHistoryForTenantByDateRange(
            @Param("tenantId") String tenantId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    @EntityGraph(attributePaths = "employee")
    @Query("""
            SELECT s
            FROM Shift s
            LEFT JOIN s.employee e
            WHERE s.tenantId = :tenantId
              AND s.shiftStart >= :startDate
              AND s.shiftStart <= :endDate
              AND (
                    LOWER(COALESCE(e.firstName, '')) LIKE :searchPattern
                    OR LOWER(COALESCE(e.lastName, '')) LIKE :searchPattern
                    OR LOWER(CONCAT(COALESCE(e.firstName, ''), ' ', COALESCE(e.lastName, ''))) LIKE :searchPattern
                    OR LOWER(COALESCE(e.username, '')) LIKE :searchPattern
                  )
            ORDER BY s.shiftStart DESC
            """)
    Page<Shift> findShiftHistoryForTenantByDateRangeAndSearch(
            @Param("tenantId") String tenantId,
            @Param("searchPattern") String searchPattern,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    @Query("SELECT s FROM Shift s WHERE s.tenantId = :tenantId " +
            "AND s.branchId = :branchId AND s.status = 'OPEN'")
    java.util.List<Shift> findActiveShiftsByBranch(
            @Param("tenantId") String tenantId,
            @Param("branchId") Long branchId);

    Long countByEmployeeIdAndTenantId(Long employeeId, String tenantId);
}
