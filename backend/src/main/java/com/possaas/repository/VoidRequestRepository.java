package com.possaas.repository;

import com.possaas.domain.order.VoidRequest;
import com.possaas.domain.order.VoidRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VoidRequestRepository extends JpaRepository<VoidRequest, Long> {

    boolean existsByOrder_IdAndStatus(Long orderId, VoidRequestStatus status);

    @Query("SELECT vr FROM VoidRequest vr " +
            "JOIN FETCH vr.order o " +
            "LEFT JOIN FETCH o.lineItems li " +
            "LEFT JOIN FETCH li.product " +
            "WHERE vr.id = :id AND vr.tenantId = :tenantId AND vr.isDeleted = false")
    Optional<VoidRequest> findByIdWithOrderDetails(
            @Param("id") Long id,
            @Param("tenantId") String tenantId);
}
