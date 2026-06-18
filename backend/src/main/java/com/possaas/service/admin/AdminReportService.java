package com.possaas.service.admin;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.possaas.config.TenantContext;
import com.possaas.domain.inventory.StockMovementType;
import com.possaas.domain.order.Order;
import com.possaas.domain.payment.Payment;
import com.possaas.domain.payment.PaymentMethod;
import com.possaas.domain.payment.PaymentStatus;
import com.possaas.domain.product.ProductStatus;
import com.possaas.domain.user.Role;
import com.possaas.dto.request.CreateProductRequest;
import com.possaas.dto.request.CreateUserRequest;
import com.possaas.dto.request.StockAdjustmentRequest;
import com.possaas.dto.response.EmployeePerformanceResponse;
import com.possaas.dto.response.ImportResultResponse;
import com.possaas.dto.response.InventoryTurnoverResponse;
import com.possaas.dto.response.PaymentAuditLogResponse;
import com.possaas.dto.response.PaymentDistributionResponse;
import com.possaas.dto.response.ProductDto;
import com.possaas.dto.response.SalesReportResponse;
import com.possaas.dto.response.TopProductResponse;
import com.possaas.repository.OrderRepository;
import com.possaas.repository.PaymentRepository;
import com.possaas.service.inventory.InventoryService;
import com.possaas.service.product.ProductService;
import com.possaas.service.user.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AdminReportService {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final InventoryService inventoryService;
    private final ProductService productService;
    private final UserService userService;
    private final ObjectMapper objectMapper;

    public List<InventoryTurnoverResponse> getInventoryTurnover(LocalDate startDate, LocalDate endDate) {
        LocalDate start = startDate != null ? startDate : LocalDate.now().minusDays(30);
        LocalDate end = endDate != null ? endDate : LocalDate.now();

        List<Order> orders = orderRepository.findByTenantIdAndCreatedAtBetween(
                TenantContext.getTenantId(),
                start.atStartOfDay(),
                end.atTime(LocalTime.MAX));

        Map<Long, Integer> soldByProduct = new HashMap<>();
        for (Order order : orders) {
            if (order.getLineItems() == null) {
                continue;
            }
            order.getLineItems()
                    .forEach(li -> soldByProduct.merge(li.getProduct().getId(), li.getQuantity(), Integer::sum));
        }

        List<ProductDto> products = productService.getAllProducts(null, null, PageRequest.of(0, 2000)).getContent();
        Map<Long, ProductDto> productMap = products.stream()
                .collect(Collectors.toMap(ProductDto::getId, p -> p, (a, b) -> a));

        List<InventoryTurnoverResponse> rows = new ArrayList<>();
        for (ProductDto product : products) {
            int sold = soldByProduct.getOrDefault(product.getId(), 0);
            int ending = product.getCurrentStock() != null ? product.getCurrentStock() : 0;
            int beginning = Math.max(ending + sold, 0);
            BigDecimal avgInventory = BigDecimal.valueOf(beginning + ending)
                    .divide(BigDecimal.valueOf(2), 4, RoundingMode.HALF_UP);
            BigDecimal turnover = avgInventory.compareTo(BigDecimal.ZERO) > 0
                    ? BigDecimal.valueOf(sold).divide(avgInventory, 4, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            String flag = turnover.compareTo(BigDecimal.valueOf(2.0)) >= 0
                    ? "HIGH"
                    : turnover.compareTo(BigDecimal.valueOf(0.8)) <= 0 ? "LOW" : "NORMAL";

            rows.add(new InventoryTurnoverResponse(
                    product.getId(),
                    product.getName(),
                    product.getSku(),
                    beginning,
                    ending,
                    sold,
                    turnover,
                    flag));
        }

        rows.sort(Comparator.comparing(InventoryTurnoverResponse::turnoverRatio).reversed());
        return rows;
    }

    public byte[] exportInventoryTurnoverCsv(LocalDate startDate, LocalDate endDate) {
        List<InventoryTurnoverResponse> rows = getInventoryTurnover(startDate, endDate);
        List<String[]> data = new ArrayList<>();
        data.add(new String[] { "Product ID", "Product", "SKU", "Beginning Inventory", "Ending Inventory", "Sold",
                "Turnover Ratio", "Flag" });
        for (InventoryTurnoverResponse row : rows) {
            data.add(new String[] {
                    String.valueOf(row.productId()),
                    row.productName(),
                    row.sku(),
                    String.valueOf(row.beginningInventory()),
                    String.valueOf(row.endingInventory()),
                    String.valueOf(row.quantitySold()),
                    row.turnoverRatio().toPlainString(),
                    row.turnoverFlag()
            });
        }
        return toCsvBytes(data);
    }

    public byte[] exportInventoryTurnoverPdf(LocalDate startDate, LocalDate endDate) {
        LocalDate start = startDate != null ? startDate : LocalDate.now().minusDays(30);
        LocalDate end = endDate != null ? endDate : LocalDate.now();
        List<InventoryTurnoverResponse> rows = getInventoryTurnover(start, end);
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            PDPageContentStream content = new PDPageContentStream(document, page);
            float y = 780;
            y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 16, "Inventory Turnover Report");
            y = writeLine(content, y, PDType1Font.HELVETICA, 10, "Range: " + start + " to " + end);
            y -= 10;
            y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 9, String.format(
                    "%-15s | %-18s | %-7s | %-7s | %-7s | %-8s | %s",
                    "SKU", "Product", "Begin", "End", "Sold", "Ratio", "Flag"));
            y -= 2;

            for (InventoryTurnoverResponse row : rows) {
                if (y < 50) {
                    content.close();
                    page = new PDPage(PDRectangle.A4);
                    document.addPage(page);
                    content = new PDPageContentStream(document, page);
                    y = 780;
                    y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 16, "Inventory Turnover Report");
                    y = writeLine(content, y, PDType1Font.HELVETICA, 10, "Range: " + start + " to " + end);
                    y -= 10;
                    y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 9, String.format(
                            "%-15s | %-18s | %-7s | %-7s | %-7s | %-8s | %s",
                            "SKU", "Product", "Begin", "End", "Sold", "Ratio", "Flag"));
                    y -= 2;
                }

                y = writeLine(content, y, PDType1Font.HELVETICA, 8,
                        String.format("%-15s | %-18s | %-7d | %-7d | %-7d | %-8s | %s",
                                truncate(row.sku(), 15),
                                truncate(row.productName(), 18),
                                row.beginningInventory(),
                                row.endingInventory(),
                                row.quantitySold(),
                                row.turnoverRatio().toPlainString(),
                                row.turnoverFlag()));
            }
            content.close();
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate inventory PDF", e);
        }
    }

    @Transactional
    public ImportResultResponse importInventoryCsv(MultipartFile file) {
        List<String> errors = new ArrayList<>();
        int total = 0;
        int success = 0;

        try {
            List<Map<String, String>> rows = parseCsv(file);
            for (Map<String, String> row : rows) {
                total++;
                try {
                    String productIdValue = row.getOrDefault("productId", "").trim();
                    if (productIdValue.isEmpty()) {
                        throw new IllegalArgumentException("productId is required");
                    }
                    Long productId = Long.parseLong(productIdValue);
                    Integer quantity = Integer.parseInt(row.getOrDefault("quantity", "0"));
                    if (quantity <= 0) {
                        throw new IllegalArgumentException("quantity must be > 0");
                    }
                    String movement = row.getOrDefault("movementType", "INITIAL_STOCK");
                    Long branchId = parseLongOrNull(row.get("branchId"));

                    StockAdjustmentRequest request = new StockAdjustmentRequest();
                    request.setProductId(productId);
                    request.setBranchId(branchId);
                    request.setQuantity(quantity);
                    request.setMovementType(StockMovementType.valueOf(movement));
                    request.setNotes(row.getOrDefault("notes", "Inventory import"));
                    inventoryService.adjustStock(request);
                    success++;
                } catch (Exception ex) {
                    errors.add("Row " + total + ": " + ex.getMessage());
                }
            }
        } catch (IOException ex) {
            errors.add("CSV parse failed: " + ex.getMessage());
        }

        return new ImportResultResponse(total, success, total - success, errors);
    }

    public List<EmployeePerformanceResponse> getEmployeePerformance(LocalDate startDate, LocalDate endDate,
            Long branchId) {
        LocalDate start = startDate != null ? startDate : LocalDate.now().minusDays(30);
        LocalDate end = endDate != null ? endDate : LocalDate.now();

        List<Order> orders = branchId != null
                ? orderRepository.findByTenantIdAndBranchIdAndCreatedAtBetween(
                        TenantContext.getTenantId(), branchId, start.atStartOfDay(), end.atTime(LocalTime.MAX))
                : orderRepository.findByTenantIdAndCreatedAtBetween(
                        TenantContext.getTenantId(), start.atStartOfDay(), end.atTime(LocalTime.MAX));

        Map<Long, List<Order>> byCashier = orders.stream()
                .filter(o -> o.getCashier() != null)
                .collect(Collectors.groupingBy(o -> o.getCashier().getId()));

        List<EmployeePerformanceResponse> responses = new ArrayList<>();
        for (Map.Entry<Long, List<Order>> entry : byCashier.entrySet()) {
            List<Order> cashierOrders = entry.getValue();
            BigDecimal totalRevenue = cashierOrders.stream()
                    .map(Order::getTotalAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            int count = cashierOrders.size();
            BigDecimal avg = count > 0
                    ? totalRevenue.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            Order sample = cashierOrders.get(0);
            String name = resolveUserName(sample.getCashier().getFirstName(), sample.getCashier().getLastName(),
                    sample.getCashier().getUsername());
            responses.add(new EmployeePerformanceResponse(
                    entry.getKey(),
                    name,
                    sample.getBranch() != null ? sample.getBranch().getId() : null,
                    count,
                    totalRevenue,
                    avg));
        }

        responses.sort(Comparator.comparing(EmployeePerformanceResponse::totalRevenue).reversed());
        return responses;
    }

    public byte[] exportEmployeePerformanceCsv(LocalDate startDate, LocalDate endDate, Long branchId) {
        List<EmployeePerformanceResponse> rows = getEmployeePerformance(startDate, endDate, branchId);
        List<String[]> data = new ArrayList<>();
        data.add(new String[] { "User ID", "Employee", "Branch ID", "Orders Processed", "Total Revenue",
                "Average Order Value" });
        for (EmployeePerformanceResponse row : rows) {
            data.add(new String[] {
                    String.valueOf(row.userId()),
                    row.employeeName(),
                    String.valueOf(row.branchId()),
                    String.valueOf(row.ordersProcessed()),
                    row.totalRevenue().toPlainString(),
                    row.avgOrderValue().toPlainString()
            });
        }
        return toCsvBytes(data);
    }

    public byte[] exportEmployeePerformancePdf(LocalDate startDate, LocalDate endDate, Long branchId) {
        List<EmployeePerformanceResponse> rows = getEmployeePerformance(startDate, endDate, branchId);
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                float y = 780;
                y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 16, "Employee Performance Report");
                y = writeLine(content, y, PDType1Font.HELVETICA, 10, "Generated: " + LocalDateTime.now());
                y -= 10;
                y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 9,
                        String.format("%-25s | %-10s | %-12s | %s", "Employee", "Orders", "Revenue", "Avg Order"));
                y -= 2;
                for (EmployeePerformanceResponse row : rows.stream().limit(40).toList()) {
                    y = writeLine(content, y, PDType1Font.HELVETICA, 8, String.format("%-25s | %-10d | %-12s | %s",
                            truncate(row.employeeName(), 25), row.ordersProcessed(), row.totalRevenue(),
                            row.avgOrderValue()));
                    if (y < 50)
                        break;
                }
            }
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate employee PDF", e);
        }
    }

    @Transactional
    public ImportResultResponse importUsersCsv(MultipartFile file) {
        List<String> errors = new ArrayList<>();
        int total = 0;
        int success = 0;

        try {
            List<Map<String, String>> rows = parseCsv(file);
            for (Map<String, String> row : rows) {
                total++;
                try {
                    CreateUserRequest request = new CreateUserRequest();
                    request.setUsername(required(row, "username"));
                    request.setEmail(required(row, "email"));
                    request.setFirstName(required(row, "firstName"));
                    request.setLastName(required(row, "lastName"));
                    request.setPassword(row.getOrDefault("password", "Temp@1234"));
                    request.setRole(Role.valueOf(row.getOrDefault("role", "ROLE_CASHIER")));
                    request.setBranchId(Long.parseLong(required(row, "branchId")));
                    userService.createUser(request);
                    success++;
                } catch (Exception ex) {
                    errors.add("Row " + total + ": " + ex.getMessage());
                }
            }
        } catch (IOException ex) {
            errors.add("CSV parse failed: " + ex.getMessage());
        }

        return new ImportResultResponse(total, success, total - success, errors);
    }

    public SalesReportResponse getSalesReport(LocalDate startDate, LocalDate endDate) {
        LocalDate start = startDate != null ? startDate : LocalDate.now().withDayOfMonth(1);
        LocalDate end = endDate != null ? endDate : LocalDate.now();

        List<Order> orders = orderRepository.findByTenantIdAndCreatedAtBetween(
                TenantContext.getTenantId(),
                start.atStartOfDay(),
                end.atTime(LocalTime.MAX));

        BigDecimal totalRevenue = orders.stream()
                .map(Order::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int transactionCount = orders.size();

        Map<Long, TopProductAccumulator> topProductMap = new LinkedHashMap<>();
        for (Order order : orders) {
            if (order.getLineItems() == null) {
                continue;
            }
            order.getLineItems().forEach(li -> {
                TopProductAccumulator acc = topProductMap.computeIfAbsent(li.getProduct().getId(),
                        k -> new TopProductAccumulator(li.getProduct().getName(), li.getProduct().getSku()));
                acc.quantity += li.getQuantity();
                acc.revenue = acc.revenue.add(BigDecimal.valueOf(li.getLineTotal()));
            });
        }

        List<TopProductResponse> topProducts = topProductMap.entrySet().stream()
                .map(e -> TopProductResponse.builder()
                        .id(e.getKey())
                        .name(e.getValue().name)
                        .sku(e.getValue().sku)
                        .quantitySold(e.getValue().quantity)
                        .revenue(e.getValue().revenue)
                        .build())
                .sorted(Comparator.comparing(TopProductResponse::getQuantitySold).reversed())
                .limit(10)
                .toList();

        Map<PaymentMethod, BigDecimal> paymentTotals = new HashMap<>();
        List<Payment> payments = paymentRepository.findByDateRange(
                TenantContext.getTenantId(),
                start.atStartOfDay(),
                end.atTime(LocalTime.MAX));
        payments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.SUCCESS)
                .forEach(p -> paymentTotals.merge(p.getMethod(), p.getAmount(), BigDecimal::add));

        BigDecimal grandTotal = paymentTotals.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        List<PaymentDistributionResponse> paymentBreakdown = paymentTotals.entrySet().stream()
                .map(e -> PaymentDistributionResponse.builder()
                        .method(e.getKey().name())
                        .amount(e.getValue())
                        .percentage(grandTotal.compareTo(BigDecimal.ZERO) > 0
                                ? e.getValue().multiply(BigDecimal.valueOf(100))
                                        .divide(grandTotal, 2, RoundingMode.HALF_UP)
                                        .doubleValue()
                                : 0.0)
                        .build())
                .sorted(Comparator.comparing(PaymentDistributionResponse::getAmount).reversed())
                .toList();

        return SalesReportResponse.builder()
                .startDate(start)
                .endDate(end)
                .totalRevenue(totalRevenue)
                .transactionCount(transactionCount)
                .topProducts(topProducts)
                .paymentBreakdown(paymentBreakdown)
                .build();
    }

    public List<PaymentAuditLogResponse> getPaymentAuditLog(LocalDate startDate, LocalDate endDate, String method,
            String status) {
        LocalDate start = startDate != null ? startDate : LocalDate.now().withDayOfMonth(1);
        LocalDate end = endDate != null ? endDate : LocalDate.now();

        List<Payment> payments = paymentRepository.findByDateRange(
                TenantContext.getTenantId(),
                start.atStartOfDay(),
                end.atTime(LocalTime.MAX));

        return payments.stream()
                .filter(p -> method == null || p.getMethod().name().equalsIgnoreCase(method))
                .filter(p -> status == null || p.getStatus().name().equalsIgnoreCase(status))
                .sorted(Comparator.comparing(Payment::getCreatedAt).reversed())
                .map(p -> new PaymentAuditLogResponse(
                        p.getId(),
                        p.getMethod().name(),
                        p.getAmount(),
                        p.getStatus().name(),
                        p.getCreatedAt(),
                        p.getTransactionId(),
                        p.getOrder() != null ? p.getOrder().getOrderNumber() : null))
                .toList();
    }

    public byte[] exportDashboardCsv(LocalDate startDate, LocalDate endDate) {
        SalesReportResponse report = getSalesReport(startDate, endDate);
        List<PaymentAuditLogResponse> audit = getPaymentAuditLog(startDate, endDate, null, null);

        List<String[]> rows = new ArrayList<>();
        rows.add(new String[] { "Sales Report" });
        rows.add(new String[] { "Start Date", String.valueOf(report.getStartDate()) });
        rows.add(new String[] { "End Date", String.valueOf(report.getEndDate()) });
        rows.add(new String[] { "Total Revenue", report.getTotalRevenue().toPlainString() });
        rows.add(new String[] { "Transaction Count", String.valueOf(report.getTransactionCount()) });
        rows.add(new String[] {});
        rows.add(new String[] { "Top Products" });
        rows.add(new String[] { "Product", "SKU", "Quantity Sold", "Revenue" });
        report.getTopProducts().forEach(p -> rows.add(new String[] {
                p.getName(),
                p.getSku(),
                String.valueOf(p.getQuantitySold()),
                p.getRevenue().toPlainString()
        }));
        rows.add(new String[] {});
        rows.add(new String[] { "Payment Audit Log" });
        rows.add(new String[] { "Method", "Amount", "Status", "Timestamp", "Gateway Ref", "Order" });
        audit.forEach(a -> rows.add(new String[] {
                a.method(),
                a.amount().toPlainString(),
                a.status(),
                String.valueOf(a.timestamp()),
                String.valueOf(a.gatewayReference()),
                String.valueOf(a.orderNumber())
        }));

        return toCsvBytes(rows);
    }

    public byte[] exportOrdersCsv(LocalDate startDate, LocalDate endDate, Long branchId) {
        LocalDate start = startDate != null ? startDate : LocalDate.now().minusDays(30);
        LocalDate end = endDate != null ? endDate : LocalDate.now();
        List<Order> orders = branchId != null
                ? orderRepository.findByTenantIdAndBranchIdAndCreatedAtBetween(
                        TenantContext.getTenantId(), branchId, start.atStartOfDay(), end.atTime(LocalTime.MAX))
                : orderRepository.findByTenantIdAndCreatedAtBetween(
                        TenantContext.getTenantId(), start.atStartOfDay(), end.atTime(LocalTime.MAX));

        List<String[]> rows = new ArrayList<>();
        rows.add(new String[] { "Order Number", "Customer", "Total Amount", "Status", "Date", "Branch" });
        for (Order o : orders) {
            rows.add(new String[] {
                    o.getOrderNumber(),
                    o.getCustomerName() != null ? o.getCustomerName() : "Walk-in",
                    o.getTotalAmount().toPlainString(),
                    o.getStatus().name(),
                    o.getCreatedAt().toString(),
                    o.getBranch() != null ? o.getBranch().getName() : "N/A"
            });
        }
        return toCsvBytes(rows);
    }

    public byte[] exportOrdersPdf(LocalDate startDate, LocalDate endDate, Long branchId) {
        LocalDate start = startDate != null ? startDate : LocalDate.now().minusDays(30);
        LocalDate end = endDate != null ? endDate : LocalDate.now();
        List<Order> orders = branchId != null
                ? orderRepository.findByTenantIdAndBranchIdAndCreatedAtBetween(
                        TenantContext.getTenantId(), branchId, start.atStartOfDay(), end.atTime(LocalTime.MAX))
                : orderRepository.findByTenantIdAndCreatedAtBetween(
                        TenantContext.getTenantId(), start.atStartOfDay(), end.atTime(LocalTime.MAX));

        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            PDPageContentStream content = new PDPageContentStream(document, page);
            float y = 780;
            y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 16, "Sales Orders Report");
            y = writeLine(content, y, PDType1Font.HELVETICA, 10, "Period: " + start + " to " + end);
            y -= 10;
            y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 9, String.format(
                    "%-12s | %-20s | %-10s | %-10s | %s", "Order #", "Customer", "Amount", "Status", "Date"));
            y -= 2;

            for (Order o : orders) {
                if (y < 50) {
                    content.close();
                    page = new PDPage(PDRectangle.A4);
                    document.addPage(page);
                    content = new PDPageContentStream(document, page);
                    y = 780;
                    y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 16, "Sales Orders Report");
                    y = writeLine(content, y, PDType1Font.HELVETICA, 10, "Period: " + start + " to " + end);
                    y -= 10;
                    y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 9, String.format(
                            "%-12s | %-20s | %-10s | %-10s | %s", "Order #", "Customer", "Amount", "Status", "Date"));
                    y -= 2;
                }

                y = writeLine(content, y, PDType1Font.HELVETICA, 8,
                        String.format("%-12s | %-20s | %-10s | %-10s | %s",
                                o.getOrderNumber(),
                                truncate(o.getCustomerName() != null ? o.getCustomerName() : "Walk-in", 20),
                                o.getTotalAmount(),
                                o.getStatus(),
                                o.getCreatedAt().toLocalDate()));
            }
            content.close();
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate orders PDF", e);
        }
    }

    public byte[] exportDashboardPdf(LocalDate startDate, LocalDate endDate) {
        SalesReportResponse report = getSalesReport(startDate, endDate);
        List<PaymentAuditLogResponse> audit = getPaymentAuditLog(startDate, endDate, null, null);

        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                float y = 780;
                y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 16, "Sales Report");
                y = writeLine(content, y, PDType1Font.HELVETICA, 11,
                        "Range: " + report.getStartDate() + " to " + report.getEndDate());
                y = writeLine(content, y, PDType1Font.HELVETICA, 11, "Total Revenue: " + report.getTotalRevenue());
                y = writeLine(content, y, PDType1Font.HELVETICA, 11,
                        "Transaction Count: " + report.getTransactionCount());
                y -= 8;
                y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 12, "Top Products");
                for (TopProductResponse p : report.getTopProducts().stream().limit(8).toList()) {
                    y = writeLine(content, y, PDType1Font.HELVETICA, 10,
                            p.getName() + " | SKU: " + p.getSku() + " | Qty: " + p.getQuantitySold() + " | Rev: "
                                    + p.getRevenue());
                    if (y < 80) {
                        break;
                    }
                }
                y -= 8;
                y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 12, "Payment Audit Log");
                for (PaymentAuditLogResponse a : audit.stream().limit(12).toList()) {
                    y = writeLine(content, y, PDType1Font.HELVETICA, 9,
                            a.timestamp() + " | " + a.method() + " | " + a.amount() + " | " + a.status() + " | "
                                    + safe(a.gatewayReference()));
                    if (y < 60) {
                        break;
                    }
                }
            }

            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate dashboard PDF", e);
        }
    }

    @Transactional
    public ImportResultResponse importDashboardCsv(MultipartFile file) {
        // Dashboard import is a validation endpoint for uploaded report data.
        List<String> errors = new ArrayList<>();
        int total = 0;
        try {
            List<Map<String, String>> rows = parseCsv(file);
            total = rows.size();
            return new ImportResultResponse(total, total, 0, errors);
        } catch (IOException e) {
            errors.add("CSV parse failed: " + e.getMessage());
            return new ImportResultResponse(total, 0, total, errors);
        }
    }

    public byte[] exportProductsCsv() {
    	List<ProductDto> products = productService.getAllProducts(null, null, PageRequest.of(0, 2000)).getContent();
        List<String[]> rows = new ArrayList<>();
        rows.add(new String[] { "Product ID", "Name", "SKU", "Price", "Status", "Category", "Current Stock" });
        products.forEach(p -> rows.add(new String[] {
                String.valueOf(p.getId()),
                p.getName(),
                p.getSku(),
                p.getPrice() != null ? p.getPrice().toPlainString() : "0",
                p.getStatus() != null ? p.getStatus().name() : "",
                p.getCategoryName() != null ? p.getCategoryName() : "",
                String.valueOf(p.getCurrentStock() != null ? p.getCurrentStock() : 0)
        }));
        return toCsvBytes(rows);
    }

    public byte[] exportProductsPdf() {
    	List<ProductDto> products = productService.getAllProducts(null, null, PageRequest.of(0, 2000)).getContent();
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                float y = 780;
                y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 16, "Product Catalog Report");
                y = writeLine(content, y, PDType1Font.HELVETICA, 10, "Generated: " + LocalDateTime.now());
                y -= 8;
                for (ProductDto p : products.stream().limit(30).toList()) {
                    y = writeLine(content, y, PDType1Font.HELVETICA, 10,
                            p.getName() + " | " + p.getSku() + " | Price: " + p.getPrice() + " | Stock: "
                                    + (p.getCurrentStock() == null ? 0 : p.getCurrentStock()));
                    if (y < 60) {
                        break;
                    }
                }
            }
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate products PDF", e);
        }
    }

    @Transactional
    public ImportResultResponse importProductsCsv(MultipartFile file, String mappingJson) {
        List<String> errors = new ArrayList<>();
        int total = 0;
        int success = 0;

        try {
            Map<String, String> mapping = mappingJson == null || mappingJson.isBlank()
                    ? Map.of(
                            "name", "name",
                            "sku", "sku",
                            "price", "price",
                            "categoryId", "categoryId",
                            "branchId", "branchId",
                            "status", "status",
                            "minStockLevel", "minStockLevel")
                    : objectMapper.readValue(mappingJson, new TypeReference<>() {
                    });

            List<Map<String, String>> rows = parseCsv(file);
            if (rows.isEmpty()) {
                throw new IllegalArgumentException("CSV file is empty or invalid format");
            }

            // Check for binary content (gibberish in first row/key)
            String firstKey = rows.get(0).keySet().iterator().next();
            if (firstKey.contains("\u0000") || firstKey.contains("\ufffd")) {
                throw new IllegalArgumentException("File appears to be binary and not a valid CSV");
            }

            for (Map<String, String> row : rows) {
                total++;
                try {
                    CreateProductRequest request = new CreateProductRequest();
                    request.setName(requiredByMapping(row, mapping, "name"));
                    request.setSku(requiredByMapping(row, mapping, "sku"));
                    request.setPrice(new BigDecimal(requiredByMapping(row, mapping, "price")));

                    String categoryId = optionalByMapping(row, mapping, "categoryId");
                    if (!categoryId.isBlank()) {
                        request.setCategoryId(Long.parseLong(categoryId));
                    }

                    String branchId = optionalByMapping(row, mapping, "branchId");
                    if (!branchId.isBlank()) {
                        request.setBranchId(Long.parseLong(branchId));
                    }

                    String status = optionalByMapping(row, mapping, "status");
                    if (!status.isBlank()) {
                        request.setStatus(ProductStatus.valueOf(status));
                    }

                    String minStock = optionalByMapping(row, mapping, "minStockLevel");
                    if (!minStock.isBlank()) {
                        request.setMinStockLevel(Integer.parseInt(minStock));
                    }

                    // Extra fields
                    String costPrice = optionalByMapping(row, mapping, "costPrice");
                    if (!costPrice.isBlank())
                        request.setCostPrice(new BigDecimal(costPrice));

                    String desc = optionalByMapping(row, mapping, "description");
                    if (!desc.isBlank())
                        request.setDescription(desc);

                    String barcode = optionalByMapping(row, mapping, "barcode");
                    if (!barcode.isBlank())
                        request.setBarcode(barcode);

                    String unit = optionalByMapping(row, mapping, "unit");
                    if (!unit.isBlank())
                        request.setUnit(unit);

                    String maxStock = optionalByMapping(row, mapping, "maxStockLevel");
                    if (!maxStock.isBlank())
                        request.setMaxStockLevel(Integer.parseInt(maxStock));

                    String reorder = optionalByMapping(row, mapping, "reorderPoint");
                    if (!reorder.isBlank())
                        request.setReorderPoint(Integer.parseInt(reorder));

                    String taxRate = optionalByMapping(row, mapping, "taxRate");
                    if (!taxRate.isBlank())
                        request.setTaxRate(new BigDecimal(taxRate));

                    String isTaxable = optionalByMapping(row, mapping, "isTaxable");
                    if (!isTaxable.isBlank())
                        request.setIsTaxable(Boolean.parseBoolean(isTaxable));

                    String allowDec = optionalByMapping(row, mapping, "allowDecimalQuantity");
                    if (!allowDec.isBlank())
                        request.setAllowDecimalQuantity(Boolean.parseBoolean(allowDec));

                    String tags = optionalByMapping(row, mapping, "tags");
                    if (!tags.isBlank())
                        request.setTags(tags);

                    String imageUrl = optionalByMapping(row, mapping, "imageUrl");
                    if (!imageUrl.isBlank())
                        request.setImageUrl(imageUrl);

                    productService.createProduct(request);
                    success++;
                } catch (Exception ex) {
                    errors.add("Row " + total + ": " + ex.getMessage());
                }
            }

        } catch (Exception ex) {
            errors.add("Import failed: " + ex.getMessage());
        }

        return new ImportResultResponse(total, success, total - success, errors);
    }

    private List<Map<String, String>> parseCsv(MultipartFile file) throws IOException {
        String content = new String(file.getBytes(), StandardCharsets.UTF_8);
        String[] lines = content.replace("\r", "").split("\n");
        if (lines.length < 2) {
            return List.of();
        }

        String[] headers = splitCsvLine(lines[0]);
        List<Map<String, String>> rows = new ArrayList<>();
        for (int i = 1; i < lines.length; i++) {
            if (lines[i].isBlank()) {
                continue;
            }
            String[] values = splitCsvLine(lines[i]);
            Map<String, String> row = new HashMap<>();
            for (int c = 0; c < headers.length; c++) {
                row.put(headers[c].trim(), c < values.length ? values[c].trim() : "");
            }
            rows.add(row);
        }
        return rows;
    }

    private String[] splitCsvLine(String line) {
        List<String> result = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }
            if (ch == ',' && !inQuotes) {
                result.add(current.toString());
                current.setLength(0);
            } else {
                current.append(ch);
            }
        }
        result.add(current.toString());
        return result.toArray(new String[0]);
    }

    private byte[] toCsvBytes(List<String[]> rows) {
        StringBuilder sb = new StringBuilder();
        for (String[] row : rows) {
            String line = java.util.Arrays.stream(row)
                    .map(this::escapeCsv)
                    .collect(Collectors.joining(","));
            sb.append(line).append("\n");
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private float writeLine(PDPageContentStream content, float y, PDType1Font font, int size, String text)
            throws IOException {
        content.beginText();
        content.setFont(font, size);
        content.newLineAtOffset(40, y);
        content.showText(text);
        content.endText();
        return y - (size + 5);
    }

    private String truncate(String text, int length) {
        if (text == null)
            return "N/A";
        return text.length() > length ? text.substring(0, length - 3) + "..." : text;
    }

    private String resolveUserName(String firstName, String lastName, String username) {
        String fullName = ((firstName == null ? "" : firstName) + " " + (lastName == null ? "" : lastName)).trim();
        return fullName.isBlank() ? username : fullName;
    }

    private String required(Map<String, String> row, String key) {
        String value = row.getOrDefault(key, "").trim();
        if (value.isBlank()) {
            throw new IllegalArgumentException(key + " is required");
        }
        return value;
    }

    private String requiredByMapping(Map<String, String> row, Map<String, String> mapping, String target) {
        String source = mapping.getOrDefault(target, target);
        String value = row.getOrDefault(source, "").trim();
        if (value.isBlank()) {
            throw new IllegalArgumentException(target + " is required (mapped from '" + source + "')");
        }
        return value;
    }

    private String optionalByMapping(Map<String, String> row, Map<String, String> mapping, String target) {
        String source = mapping.getOrDefault(target, target);
        return row.getOrDefault(source, "").trim();
    }

    private Long parseLongOrNull(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return Long.parseLong(raw.trim());
    }

    private String safe(String value) {
        return value == null ? "N/A" : value;
    }

    private static class TopProductAccumulator {
        private final String name;
        private final String sku;
        private int quantity;
        private BigDecimal revenue;

        private TopProductAccumulator(String name, String sku) {
            this.name = name;
            this.sku = sku;
            this.quantity = 0;
            this.revenue = BigDecimal.ZERO;
        }
    }
}
