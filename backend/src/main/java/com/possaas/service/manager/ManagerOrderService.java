package com.possaas.service.manager;

import java.io.IOException;
import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.possaas.config.TenantContext;
import com.possaas.domain.order.Order;
import com.possaas.domain.order.OrderLineItem;
import com.possaas.domain.order.OrderStatus;
import com.possaas.domain.user.User;
import com.possaas.dto.request.RefundItemRequest;
import com.possaas.dto.request.RefundRequest;
import com.possaas.dto.response.OrderSummaryDto;
import com.possaas.dto.response.OrderDto;
import com.possaas.dto.response.OrderLineItemDto;
import com.possaas.dto.response.PaymentDto;
import com.possaas.exception.UnauthorizedOperationException;
import com.possaas.repository.OrderRepository;
import com.possaas.repository.UserRepository;
import com.possaas.service.inventory.InventoryService;
import com.possaas.service.payment.PaymentService;
import com.possaas.service.order.OrderService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ManagerOrderService {
        private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

        private final OrderRepository orderRepository;
        private final UserRepository userRepository;
        private final PaymentService paymentService;
        private final InventoryService inventoryService;
        private final OrderService orderService;

        /**
         * 🔐 Get authenticated user (Tenant aware)
         */
        private User getAuthenticatedUser() {

                Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

                if (authentication == null || !authentication.isAuthenticated()) {
                        throw new RuntimeException("User not authenticated");
                }

                String username = authentication.getName();
                String tenantId = TenantContext.getTenantId();

                return userRepository
                                .findByUsernameAndTenantId(username, tenantId)
                                .orElseThrow(() -> new RuntimeException("User not found"));
        }

        /**
         * 🏢 Get branch ID from authenticated user
         */
        private Long getCurrentUserBranchId(User user) {

                if (user.getBranch() == null) {
                        throw new RuntimeException("User not assigned to any branch");
                }

                return user.getBranch().getId();
        }

        /**
         * 📦 Get Orders (Manager - Branch Scoped)
         */
        public Page<OrderSummaryDto> getOrders(
                        String search,
                        String status,
                        String paymentMethod,
                        Long cashierId,
                        LocalDate startDate,
                        LocalDate endDate,
                        Pageable pageable) {

                String tenantId = TenantContext.getTenantId();
                User user = getAuthenticatedUser();
                Long branchId = getCurrentUserBranchId(user);

                LocalDateTime startDateTime = startDate != null ? startDate.atStartOfDay()
                                : LocalDateTime.now().minusMonths(1);

                LocalDateTime endDateTime = endDate != null ? endDate.atTime(LocalTime.MAX)
                                : LocalDateTime.now();

                List<Order> orders = orderRepository
                                .findByTenantIdAndBranchIdAndCreatedAtBetween(
                                                tenantId,
                                                branchId,
                                                startDateTime,
                                                endDateTime);

                String normalizedSearch = search == null ? "" : search.trim().toLowerCase();

                List<OrderSummaryDto> filtered = orders.stream()
                                .filter(o -> normalizedSearch.isBlank() ||
                                                containsIgnoreCase(o.getOrderNumber(), normalizedSearch) ||
                                                containsIgnoreCase(o.getCustomerName(), normalizedSearch) ||
                                                containsIgnoreCase(o.getCustomerEmail(), normalizedSearch))
                                .filter(o -> status == null || status.isBlank() ||
                                                o.getStatus().name()
                                                                .equalsIgnoreCase(status))
                                .filter(o -> paymentMethod == null || paymentMethod.isBlank() ||
                                                extractPaymentMethod(o).equalsIgnoreCase(paymentMethod))
                                .filter(o -> cashierId == null ||
                                                o.getCashier().getId().equals(cashierId))
                                .map(orderService::mapToSummaryDto)
                                .collect(Collectors.toList());

                if (!pageable.isPaged()) {
                        return new PageImpl<>(filtered, pageable, filtered.size());
                }

                int start = (int) pageable.getOffset();

                if (start >= filtered.size()) {
                        return new PageImpl<>(List.of(), pageable, filtered.size());
                }

                int end = Math.min(start + pageable.getPageSize(), filtered.size());

                return new PageImpl<>(
                                filtered.subList(start, end),
                                pageable,
                                filtered.size());
        }

        /**
         * 💰 Process Refund
         */
        @Transactional
        public OrderDto processRefund(Long orderId, RefundRequest request) {

                String tenantId = TenantContext.getTenantId();
                User user = getAuthenticatedUser();
                Long branchId = getCurrentUserBranchId(user);

                Order order = orderRepository.findById(orderId)
                                .orElseThrow(() -> new RuntimeException("Order not found"));

                // 🔐 Tenant Validation
                if (!tenantId.equals(order.getTenantId())) {
                        throw new UnauthorizedOperationException(
                                        "Order does not belong to your tenant");
                }

                // 🔐 Branch Validation
                if (order.getBranch() == null ||
                                !order.getBranch().getId().equals(branchId)) {
                        throw new UnauthorizedOperationException(
                                        "Order does not belong to your branch");
                }

                if (order.getStatus() != OrderStatus.COMPLETED && order.getStatus() != OrderStatus.PARTIAL_REFUND) {
                        throw new IllegalArgumentException("Only completed or partial refund orders can be refunded");
                }

                if (request.getItems() == null || request.getItems().isEmpty()) {
                        throw new IllegalArgumentException("At least one refund item is required");
                }

                Map<Long, Integer> purchasedQtyByProduct = order.getLineItems().stream()
                                .collect(Collectors.groupingBy(
                                                item -> item.getProduct().getId(),
                                                Collectors.summingInt(OrderLineItem::getQuantity)));

                Map<Long, Double> lineTotalByProduct = new HashMap<>();
                order.getLineItems().forEach(item -> {
                        Long productId = item.getProduct().getId();
                        double runningTotal = lineTotalByProduct.getOrDefault(productId, 0.0);
                        lineTotalByProduct.put(productId, runningTotal + item.getLineTotal());
                });

                Map<Long, Integer> refundQtyByProduct = new HashMap<>();
                for (RefundItemRequest refundItem : request.getItems()) {
                        if (refundItem.getProductId() == null || refundItem.getQuantity() == null
                                        || refundItem.getQuantity() <= 0) {
                                throw new IllegalArgumentException("Invalid refund item payload");
                        }

                        Integer purchasedQty = purchasedQtyByProduct.get(refundItem.getProductId());
                        if (purchasedQty == null) {
                                throw new IllegalArgumentException("Refund item does not belong to this order");
                        }

                        int requestedQty = refundQtyByProduct.getOrDefault(refundItem.getProductId(), 0)
                                        + refundItem.getQuantity();
                        if (requestedQty > purchasedQty) {
                                throw new IllegalArgumentException("Refund quantity exceeds purchased quantity");
                        }

                        refundQtyByProduct.put(refundItem.getProductId(), requestedQty);
                }

                BigDecimal refundedSubtotal = BigDecimal.ZERO;
                for (Map.Entry<Long, Integer> entry : refundQtyByProduct.entrySet()) {
                        Long productId = entry.getKey();
                        int refundQty = entry.getValue();
                        int purchasedQty = purchasedQtyByProduct.get(productId);
                        double productLineTotal = lineTotalByProduct.getOrDefault(productId, 0.0);

                        BigDecimal lineTotal = BigDecimal.valueOf(productLineTotal);
                        BigDecimal ratio = BigDecimal.valueOf(refundQty)
                                        .divide(BigDecimal.valueOf(purchasedQty), 6, RoundingMode.HALF_UP);
                        refundedSubtotal = refundedSubtotal.add(lineTotal.multiply(ratio));
                }

                BigDecimal refundAmount;
                if (order.getSubtotal() != null && order.getSubtotal().compareTo(BigDecimal.ZERO) > 0) {
                        BigDecimal subtotalRatio = refundedSubtotal
                                        .divide(order.getSubtotal(), 6, RoundingMode.HALF_UP);
                        refundAmount = order.getTotalAmount().multiply(subtotalRatio).setScale(2, RoundingMode.HALF_UP);
                } else {
                        refundAmount = refundedSubtotal.setScale(2, RoundingMode.HALF_UP);
                }

                if (refundAmount.compareTo(BigDecimal.ZERO) <= 0) {
                        throw new IllegalArgumentException("Refund amount must be greater than zero");
                }

                boolean fullRefund = refundQtyByProduct.size() == purchasedQtyByProduct.size()
                                && purchasedQtyByProduct.entrySet().stream()
                                                .allMatch(entry -> refundQtyByProduct
                                                                .getOrDefault(entry.getKey(), 0)
                                                                .equals(entry.getValue()));

                // Refund payment first. If gateway refund fails, continue manager refund flow
                // so order status/inventory are still updated as requested.
                ensureLineItemsSnapshot(order);
                try {
                        paymentService.refundOrderPayment(order, refundAmount, request.getReason());
                } catch (Exception ex) {
                        log.warn("Payment refund failed for order {}. Continuing with manager refund flow. reason={}",
                                        orderId, ex.getMessage(), ex);
                }

                refundQtyByProduct.forEach(inventoryService::addStock);
                applyRefundToOrderLineItems(order, refundQtyByProduct);
                recalculateOrderTotalsFromRemainingItems(order);

                order.setStatus(fullRefund ? OrderStatus.REFUNDED : OrderStatus.PARTIAL_REFUND);
                orderRepository.save(order);

                log.info("Order {} refunded by {}", orderId, user.getUsername());

                return convertToDto(order);
        }

        /**
         * 📤 Export Orders (CSV)
         */
        public Resource exportOrders(
                        String format,
                        String status,
                        String paymentMethod,
                        Long cashierId,
                        LocalDate startDate,
                        LocalDate endDate) {

                Page<OrderSummaryDto> page = getOrders(
                                null, status, paymentMethod,
                                cashierId, startDate, endDate,
                                Pageable.unpaged());

                if ("pdf".equalsIgnoreCase(format)) {
                        return generatePdf(page.getContent());
                }
                return generateCsv(page.getContent());
        }

        private Resource generateCsv(List<OrderSummaryDto> orders) {
                if (orders == null) {
                        log.warn("Attempted to generate CSV for null order list");
                        return new ByteArrayResource(new byte[0]);
                }

                try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                                PrintWriter writer = new PrintWriter(
                                                new OutputStreamWriter(
                                                                outputStream,
                                                                StandardCharsets.UTF_8))) {

                        writer.println(
                                        "Order Number,Date,Cashier,Subtotal,Tax,Total,Status,Payment Method");

                        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

                        for (OrderSummaryDto o : orders) {
                                if (o == null)
                                        continue;
                                writer.printf("%s,%s,%s,%.2f,%.2f,%.2f,%s,%s%n",
                                                o.getOrderNumber() != null ? o.getOrderNumber() : "N/A",
                                                o.getCreatedAt() != null ? o.getCreatedAt().format(formatter) : "N/A",
                                                o.getCashierName() != null ? o.getCashierName().replace(",", " ")
                                                                : "Guest",
                                                o.getSubtotal() != null ? o.getSubtotal().doubleValue() : 0.0,
                                                o.getTax() != null ? o.getTax().doubleValue() : 0.0,
                                                o.getTotal() != null ? o.getTotal().doubleValue() : 0.0,
                                                o.getStatus() != null ? o.getStatus().toString() : "UNKNOWN",
                                                o.getPaymentMethod() != null ? o.getPaymentMethod() : "N/A");
                        }

                        writer.flush();
                        return new ByteArrayResource(outputStream.toByteArray());

                } catch (Exception e) {
                        log.error("CSV generation failed", e);
                        throw new RuntimeException("Failed to generate CSV: " + e.getMessage());
                }
        }

        private Resource generatePdf(List<OrderSummaryDto> orders) {
                try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                        PDPage page = new PDPage(PDRectangle.A4);
                        document.addPage(page);

                        try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                                float y = 780;
                                y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 16, "Branch Orders Report");
                                y = writeLine(content, y, PDType1Font.HELVETICA, 10,
                                                "Generated: " + LocalDateTime.now());
                                y -= 8;
                                y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 11,
                                                "Order | Date | Cashier | Total | Status | Payment");
                                for (OrderSummaryDto o : orders.stream().limit(30).toList()) {
                                        String line = String.format(
                                                        "%s | %s | %s | %.2f | %s | %s",
                                                        o.getOrderNumber() == null ? "N/A" : o.getOrderNumber(),
                                                        o.getCreatedAt() == null ? "N/A"
                                                                        : o.getCreatedAt().toLocalDate().toString(),
                                                        o.getCashierName() == null ? "N/A" : o.getCashierName(),
                                                        o.getTotal() == null ? 0.0 : o.getTotal().doubleValue(),
                                                        o.getStatus() == null ? "N/A" : o.getStatus().name(),
                                                        o.getPaymentMethod() == null ? "N/A" : o.getPaymentMethod());
                                        y = writeLine(content, y, PDType1Font.HELVETICA, 9, line);
                                        if (y < 60) {
                                                break;
                                        }
                                }
                        }

                        document.save(out);
                        return new ByteArrayResource(out.toByteArray());
                } catch (IOException e) {
                        throw new RuntimeException("Failed to generate PDF: " + e.getMessage(), e);
                }
        }

        private float writeLine(PDPageContentStream content, float y, PDType1Font font, int size, String text)
                        throws IOException {
                content.beginText();
                content.setFont(font, size);
                content.newLineAtOffset(40, y);
                content.showText(text.length() > 110 ? text.substring(0, 110) : text);
                content.endText();
                return y - (size + 4);
        }

        /**
         * 🔄 Convert Order → DTO
         */
        private OrderDto convertToDto(Order order) {
                if (order == null)
                        return null;

                List<OrderLineItemDto> items = resolveLineItemDtos(order);

                String paymentMethod = aggregatePaymentMethods(order);
                String paymentStatus = "N/A";

                if (order.getPayments() != null && !order.getPayments().isEmpty()) {
                        try {
                                paymentStatus = order.getPayments().get(0).getStatus().name();
                        } catch (Exception e) {
                                log.warn("Error extracting payment details for order {}", order.getId());
                        }
                }

                String cashierName = "System";
                if (order.getCashier() != null) {
                        String first = Objects.toString(order.getCashier().getFirstName(), "");
                        String last = Objects.toString(order.getCashier().getLastName(), "");
                        cashierName = (first + " " + last).trim();
                        if (cashierName.isEmpty())
                                cashierName = order.getCashier().getUsername();
                }

                return OrderDto.builder()
                                .id(order.getId())
                                .orderNumber(order.getOrderNumber())
                                .subtotal(order.getSubtotal())
                                .tax(order.getTax())
                                .total(order.getTotalAmount())
                                .status(order.getStatus())
                                .createdAt(order.getCreatedAt())
                                .cashierName(cashierName)
                                .customerName(order.getCustomerName())
                                .customerEmail(order.getCustomerEmail())
                                .lineItems(items)
                                .paymentMethod(paymentMethod)
                                .paymentStatus(paymentStatus)
                                .build();
        }

        private String extractPaymentMethod(Order order) {
                return aggregatePaymentMethods(order);
        }

        private boolean containsIgnoreCase(String source, String normalizedSearch) {
                return source != null && source.toLowerCase().contains(normalizedSearch);
        }

        private String aggregatePaymentMethods(Order order) {
                if (order == null || order.getPayments() == null || order.getPayments().isEmpty()) {
                        return "N/A";
                }

                String methods = order.getPayments().stream()
                                .map(payment -> payment.getMethod() != null ? payment.getMethod().name() : null)
                                .filter(Objects::nonNull)
                                .distinct()
                                .collect(Collectors.joining(" + "));

                return methods.isBlank() ? "N/A" : methods;
        }

        private OrderLineItemDto convertLineItemToDto(OrderLineItem item) {

                return OrderLineItemDto.builder()
                                .productId(item.getProduct().getId())
                                .productName(item.getProduct().getName())
                                .sku(item.getProduct().getSku())
                                .quantity(item.getQuantity())
                                .price(item.getPrice())
                                .lineTotal(item.getLineTotal())
                                .build();
        }

        private List<OrderLineItemDto> resolveLineItemDtos(Order order) {
                if (order != null && order.getLineItems() != null && !order.getLineItems().isEmpty()) {
                        return order.getLineItems().stream()
                                        .filter(Objects::nonNull)
                                        .map(this::convertLineItemToDto)
                                        .collect(Collectors.toList());
                }

                if (order == null || order.getLineItemsSnapshot() == null || order.getLineItemsSnapshot().isBlank()) {
                        return List.of();
                }

                try {
                        return OBJECT_MAPPER.readValue(order.getLineItemsSnapshot(),
                                        new TypeReference<List<OrderLineItemDto>>() {});
                } catch (Exception ex) {
                        log.warn("Failed to parse line item snapshot for order {}", order.getId(), ex);
                        return List.of();
                }
        }

        private void ensureLineItemsSnapshot(Order order) {
                if (order == null) {
                        return;
                }

                if (order.getLineItemsSnapshot() != null && !order.getLineItemsSnapshot().isBlank()) {
                        return;
                }

                if (order.getLineItems() == null || order.getLineItems().isEmpty()) {
                        return;
                }

                try {
                        order.setLineItemsSnapshot(
                                        OBJECT_MAPPER.writeValueAsString(
                                                        order.getLineItems().stream()
                                                                        .filter(Objects::nonNull)
                                                                        .map(this::convertLineItemToDto)
                                                                        .collect(Collectors.toList())));
                } catch (Exception ex) {
                        log.warn("Failed to create line item snapshot for order {}", order.getId(), ex);
                }
        }

        private void recalculateOrderTotalsFromRemainingItems(Order order) {
                if (order == null || order.getLineItems() == null) {
                        return;
                }

                BigDecimal subtotal = order.getLineItems().stream()
                                .filter(Objects::nonNull)
                                .map(item -> BigDecimal.valueOf(item.getLineTotal() == null ? 0.0 : item.getLineTotal()))
                                .reduce(BigDecimal.ZERO, BigDecimal::add)
                                .setScale(2, RoundingMode.HALF_UP);

                BigDecimal subtotalBeforeDiscount = order.getLineItems().stream()
                                .filter(Objects::nonNull)
                                .map(item -> item.getSubtotalBeforeDiscount() == null ? BigDecimal.ZERO : item.getSubtotalBeforeDiscount())
                                .reduce(BigDecimal.ZERO, BigDecimal::add)
                                .setScale(2, RoundingMode.HALF_UP);

                BigDecimal discountAmount = order.getLineItems().stream()
                                .filter(Objects::nonNull)
                                .map(item -> item.getDiscountAmount() == null ? BigDecimal.ZERO : item.getDiscountAmount())
                                .reduce(BigDecimal.ZERO, BigDecimal::add)
                                .setScale(2, RoundingMode.HALF_UP);

                BigDecimal taxableAmount = order.getLineItems().stream()
                                .filter(Objects::nonNull)
                                .map(item -> item.getTaxableAmount() == null ? BigDecimal.ZERO : item.getTaxableAmount())
                                .reduce(BigDecimal.ZERO, BigDecimal::add)
                                .setScale(2, RoundingMode.HALF_UP);

                BigDecimal taxAmount = order.getLineItems().stream()
                                .filter(Objects::nonNull)
                                .map(item -> item.getTaxAmount() == null ? BigDecimal.ZERO : item.getTaxAmount())
                                .reduce(BigDecimal.ZERO, BigDecimal::add)
                                .setScale(2, RoundingMode.HALF_UP);

                BigDecimal finalTotal = order.getLineItems().stream()
                                .filter(Objects::nonNull)
                                .map(item -> item.getFinalTotal() == null ? BigDecimal.ZERO : item.getFinalTotal())
                                .reduce(BigDecimal.ZERO, BigDecimal::add)
                                .setScale(2, RoundingMode.HALF_UP);

                order.setSubtotal(subtotal);
                order.setSubtotalBeforeDiscount(subtotalBeforeDiscount);
                order.setDiscount(discountAmount);
                order.setDiscountAmount(discountAmount);
                order.setTaxableAmount(taxableAmount);
                order.setTaxAmount(taxAmount);
                order.setTax(taxAmount);
                order.setFinalTotal(finalTotal);
                order.setTotalAmount(finalTotal);
        }

        private void applyRefundToOrderLineItems(Order order, Map<Long, Integer> refundQtyByProduct) {
                if (order == null || order.getLineItems() == null || order.getLineItems().isEmpty()
                                || refundQtyByProduct == null) {
                        return;
                }

                for (OrderLineItem lineItem : order.getLineItems()) {
                        if (lineItem.getProduct() == null || lineItem.getProduct().getId() == null) {
                                continue;
                        }

                        Long productId = lineItem.getProduct().getId();
                        int remainingToRefund = refundQtyByProduct.getOrDefault(productId, 0);
                        if (remainingToRefund <= 0) {
                                continue;
                        }

                        int currentQty = lineItem.getQuantity() == null ? 0 : lineItem.getQuantity();
                        if (currentQty <= 0) {
                                continue;
                        }

                        int deductQty = Math.min(currentQty, remainingToRefund);
                        int newQty = currentQty - deductQty;

                        double currentLineTotal = lineItem.getLineTotal() == null ? 0.0 : lineItem.getLineTotal();
                        double unitLineTotal = currentQty > 0 ? currentLineTotal / currentQty : 0.0;
                        lineItem.setQuantity(newQty);
                        lineItem.setLineTotal(newQty * unitLineTotal);

                        refundQtyByProduct.put(productId, remainingToRefund - deductQty);
                }

                // Keep refunded line items on the order for history/detail views.
                // Quantity and line total are reduced to reflect the refund, but the product row
                // must remain visible so refunded orders still show their original product details.
        }
}
