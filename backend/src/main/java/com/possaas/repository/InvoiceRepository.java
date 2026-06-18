package com.possaas.repository;


import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Pageable;
import com.possaas.domain.tenant.Invoice;
import com.possaas.domain.tenant.InvoiceStatus;

@Repository
public interface InvoiceRepository
        extends JpaRepository<Invoice, Long> {

    Page<Invoice> findByTenantId(String tenantId, Pageable pageable);
    List<Invoice> findByStatusAndDueDateBefore(
            InvoiceStatus status,
            LocalDate date
    );
}