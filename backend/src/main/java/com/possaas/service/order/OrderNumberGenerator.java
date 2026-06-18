package com.possaas.service.order;

import com.possaas.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class OrderNumberGenerator {

    private final OrderRepository orderRepository;
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

    /**
     * Generates a unique order number: ORD-YYYYMMDD-####
     * Uses REQUIRES_NEW to ensure the sequence check is isolated.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public synchronized String generate(String tenantId) {
        LocalDate today = LocalDate.now();
        String datePart = today.format(DATE_FORMAT);
        LocalDateTime startOfDay = today.atStartOfDay();

        // 1. Query DB for the highest order number today (BE-06)
        String maxOrderNum = orderRepository.findMaxOrderNumberForToday(tenantId, startOfDay)
                .orElse(null);

        int nextSequence = 1;
        if (maxOrderNum != null && maxOrderNum.length() > 5) {
            try {
                // Extract the #### part from "ORD-YYYYMMDD-####"
                String lastSequenceStr = maxOrderNum.substring(maxOrderNum.lastIndexOf("-") + 1);
                nextSequence = Integer.parseInt(lastSequenceStr) + 1;
            } catch (Exception e) {
                nextSequence = 1; // Fallback if parsing fails
            }
        }

        // 2. Format sequence as 4-digit zero-padded (BE-08)
        String sequencePart = String.format("%04d", nextSequence);

        // 3. Combine parts (BE-09): ORD-YYYYMMDD-####
        return "ORD-" + datePart + "-" + sequencePart;
    }
}