package com.possaas.repository;

import com.possaas.domain.order.RefundRequest;
import com.possaas.domain.order.RefundRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RefundRequestRepository extends JpaRepository<RefundRequest, Long> {

    boolean existsByOrder_IdAndStatus(Long orderId, RefundRequestStatus status);

    @Query("SELECT rr FROM RefundRequest rr " +
            "JOIN FETCH rr.order o " +
            "LEFT JOIN FETCH o.lineItems li " +
            "LEFT JOIN FETCH li.product " +
            "WHERE rr.id = :id AND rr.tenantId = :tenantId AND rr.isDeleted = false")
    Optional<RefundRequest> findByIdWithOrderDetails(
            @Param("id") Long id,
            @Param("tenantId") String tenantId);
}
