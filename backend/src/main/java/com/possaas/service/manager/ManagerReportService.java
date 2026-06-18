package com.possaas.service.manager;

import com.possaas.domain.inventory.StockMovementType;
import com.possaas.domain.order.Order;
import com.possaas.domain.payment.Payment;
import com.possaas.domain.payment.PaymentStatus;
import com.possaas.domain.user.Role;
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
import com.possaas.service.security.AccessScopeService;
import com.possaas.service.user.UserService;
import lombok.RequiredArgsConstructor;
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
@Transactional(readOnly = true)
public class ManagerReportService {

    private final AccessScopeService accessScopeService;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final ProductService productService;
    private final InventoryService inventoryService;
    private final UserService userService;

    public List<InventoryTurnoverResponse> getInventoryTurnover(LocalDate startDate, LocalDate endDate) {
        Long branchId = accessScopeService.getCurrentBranchIdRequired(accessScopeService.getCurrentUser());
        LocalDate start = startDate != null ? startDate : LocalDate.now().minusDays(30);
        LocalDate end = endDate != null ? endDate : LocalDate.now();

        List<Order> orders = orderRepository.findByTenantIdAndBranchIdAndCreatedAtBetween(
                com.possaas.config.TenantContext.getTenantId(),
                branchId,
                start.atStartOfDay(),
                end.atTime(LocalTime.MAX));

        Map<Long, Integer> soldByProduct = new HashMap<>();
        for (Order order : orders) {
            if (order.getLineItems() == null)
                continue;
            order.getLineItems()
                    .forEach(li -> soldByProduct.merge(li.getProduct().getId(), li.getQuantity(), Integer::sum));
        }

        List<ProductDto> products = productService.getAllProducts(null, branchId, PageRequest.of(0, 2000)).getContent();
        Map<Long, ProductDto> productMap = products.stream()
                .collect(Collectors.toMap(ProductDto::getId, p -> p, (a, b) -> a));

        List<InventoryTurnoverResponse> rows = new ArrayList<>();
        for (Map.Entry<Long, Integer> entry : soldByProduct.entrySet()) {
            ProductDto product = productMap.get(entry.getKey());
            if (product == null)
                continue;
            int sold = entry.getValue();
            int ending = product.getCurrentStock() == null ? 0 : product.getCurrentStock();
            int beginning = Math.max(ending + sold, 0);
            BigDecimal avgInventory = BigDecimal.valueOf(beginning + ending).divide(BigDecimal.valueOf(2), 4,
                    RoundingMode.HALF_UP);
            BigDecimal turnover = avgInventory.compareTo(BigDecimal.ZERO) > 0
                    ? BigDecimal.valueOf(sold).divide(avgInventory, 4, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            String flag = turnover.compareTo(BigDecimal.valueOf(2.0)) >= 0
                    ? "HIGH"
                    : turnover.compareTo(BigDecimal.valueOf(0.8)) <= 0 ? "LOW" : "NORMAL";
            rows.add(new InventoryTurnoverResponse(product.getId(), product.getName(), product.getSku(), beginning,
                    ending, sold, turnover, flag));
        }

        rows.sort(Comparator.comparing(InventoryTurnoverResponse::turnoverRatio).reversed());
        return rows;
    }

    public byte[] exportInventoryTurnoverCsv(LocalDate startDate, LocalDate endDate) {
        List<String[]> rows = new ArrayList<>();
        rows.add(new String[] { "Product ID", "Product", "SKU", "Beginning Inventory", "Ending Inventory", "Sold",
                "Turnover Ratio", "Flag" });
        getInventoryTurnover(startDate, endDate).forEach(r -> rows.add(new String[] {
                String.valueOf(r.productId()), r.productName(), r.sku(), String.valueOf(r.beginningInventory()),
                String.valueOf(r.endingInventory()), String.valueOf(r.quantitySold()),
                r.turnoverRatio().toPlainString(), r.turnoverFlag()
        }));
        return toCsv(rows);
    }

    public byte[] exportInventoryTurnoverPdf(LocalDate startDate, LocalDate endDate) {
        List<InventoryTurnoverResponse> data = getInventoryTurnover(startDate, endDate);
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                float y = 780;
                y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 16, "Branch Inventory Turnover Report");
                y = writeLine(content, y, PDType1Font.HELVETICA, 11, "Range: " + (startDate != null ? startDate : "N/A")
                        + " to " + (endDate != null ? endDate : "N/A"));
                y -= 10;
                y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 10,
                        "Product | SKU | Beginning | Ending | Sold | Ratio | Flag");
                y -= 5;
                for (InventoryTurnoverResponse r : data.stream().limit(25).toList()) {
                    y = writeLine(content, y, PDType1Font.HELVETICA, 9,
                            r.productName() + " | " + r.sku() + " | " + r.beginningInventory() + " | "
                                    + r.endingInventory() + " | " + r.quantitySold() + " | " + r.turnoverRatio() + " | "
                                    + r.turnoverFlag());
                    if (y < 50)
                        break;
                }
            }
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate inventory PDF", e);
        }
    }

    @Transactional
    public ImportResultResponse importInventoryCsv(MultipartFile file) {
        Long branchId = accessScopeService.getCurrentBranchIdRequired(accessScopeService.getCurrentUser());
        int total = 0;
        int success = 0;
        List<String> errors = new ArrayList<>();

        try {
            for (Map<String, String> row : parseCsv(file)) {
                total++;
                try {
                    StockAdjustmentRequest request = new StockAdjustmentRequest();
                    request.setProductId(Long.parseLong(required(row, "productId")));
                    request.setBranchId(branchId);
                    request.setQuantity(Integer.parseInt(required(row, "quantity")));
                    request.setMovementType(
                            StockMovementType.valueOf(row.getOrDefault("movementType", "INITIAL_STOCK")));
                    request.setNotes(row.getOrDefault("notes", "Manager inventory import"));
                    inventoryService.adjustStock(request);
                    success++;
                } catch (Exception e) {
                    errors.add("Row " + total + ": " + e.getMessage());
                }
            }
        } catch (Exception e) {
            errors.add("Import parse failed: " + e.getMessage());
        }

        return new ImportResultResponse(total, success, total - success, errors);
    }

    public List<EmployeePerformanceResponse> getEmployeePerformance(LocalDate startDate, LocalDate endDate) {
        Long branchId = accessScopeService.getCurrentBranchIdRequired(accessScopeService.getCurrentUser());
        LocalDate start = startDate != null ? startDate : LocalDate.now().minusDays(30);
        LocalDate end = endDate != null ? endDate : LocalDate.now();

        List<Order> orders = orderRepository.findByTenantIdAndBranchIdAndCreatedAtBetween(
                com.possaas.config.TenantContext.getTenantId(),
                branchId,
                start.atStartOfDay(),
                end.atTime(LocalTime.MAX));

        Map<Long, List<Order>> byCashier = orders.stream()
                .filter(o -> o.getCashier() != null)
                .collect(Collectors.groupingBy(o -> o.getCashier().getId()));

        List<EmployeePerformanceResponse> response = new ArrayList<>();
        for (Map.Entry<Long, List<Order>> entry : byCashier.entrySet()) {
            List<Order> cashierOrders = entry.getValue();
            BigDecimal totalRevenue = cashierOrders.stream().map(Order::getTotalAmount).filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            int count = cashierOrders.size();
            BigDecimal avg = count > 0 ? totalRevenue.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            Order sample = cashierOrders.get(0);
            String name = ((sample.getCashier().getFirstName() == null ? "" : sample.getCashier().getFirstName()) + " "
                    +
                    (sample.getCashier().getLastName() == null ? "" : sample.getCashier().getLastName())).trim();
            if (name.isBlank())
                name = sample.getCashier().getUsername();
            response.add(new EmployeePerformanceResponse(entry.getKey(), name, branchId, count, totalRevenue, avg));
        }

        response.sort(Comparator.comparing(EmployeePerformanceResponse::totalRevenue).reversed());
        return response;
    }

    public byte[] exportEmployeePerformanceCsv(LocalDate startDate, LocalDate endDate) {
        List<String[]> rows = new ArrayList<>();
        rows.add(new String[] { "User ID", "Employee", "Branch ID", "Orders Processed", "Total Revenue",
                "Average Order Value" });
        getEmployeePerformance(startDate, endDate).forEach(r -> rows.add(new String[] {
                String.valueOf(r.userId()), r.employeeName(), String.valueOf(r.branchId()),
                String.valueOf(r.ordersProcessed()), r.totalRevenue().toPlainString(), r.avgOrderValue().toPlainString()
        }));
        return toCsv(rows);
    }

    public byte[] exportEmployeePerformancePdf(LocalDate startDate, LocalDate endDate) {
        List<EmployeePerformanceResponse> data = getEmployeePerformance(startDate, endDate);
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                float y = 780;
                y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 16, "Branch Employee Performance Report");
                y = writeLine(content, y, PDType1Font.HELVETICA, 11, "Range: " + (startDate != null ? startDate : "N/A")
                        + " to " + (endDate != null ? endDate : "N/A"));
                y -= 10;
                y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 10,
                        "Employee | Orders | Total Revenue | Avg Order Value");
                y -= 5;
                for (EmployeePerformanceResponse r : data.stream().limit(30).toList()) {
                    y = writeLine(content, y, PDType1Font.HELVETICA, 9,
                            r.employeeName() + " | " + r.ordersProcessed() + " | " + r.totalRevenue() + " | "
                                    + r.avgOrderValue());
                    if (y < 50)
                        break;
                }
            }
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate employee performance PDF", e);
        }
    }

    @Transactional
    public ImportResultResponse importEmployeesCsv(MultipartFile file) {
        Long branchId = accessScopeService.getCurrentBranchIdRequired(accessScopeService.getCurrentUser());
        int total = 0;
        int success = 0;
        List<String> errors = new ArrayList<>();

        try {
            for (Map<String, String> row : parseCsv(file)) {
                total++;
                try {
                    CreateUserRequest request = new CreateUserRequest();
                    request.setUsername(required(row, "username"));
                    request.setEmail(required(row, "email"));
                    request.setFirstName(required(row, "firstName"));
                    request.setLastName(required(row, "lastName"));
                    request.setPassword(row.getOrDefault("password", "Temp@1234"));
                    request.setRole(Role.valueOf(row.getOrDefault("role", "ROLE_CASHIER")));
                    request.setBranchId(branchId);
                    userService.createUser(request);
                    success++;
                } catch (Exception e) {
                    errors.add("Row " + total + ": " + e.getMessage());
                }
            }
        } catch (Exception e) {
            errors.add("Import parse failed: " + e.getMessage());
        }

        return new ImportResultResponse(total, success, total - success, errors);
    }

    public SalesReportResponse getSalesReport(LocalDate startDate, LocalDate endDate) {
        Long branchId = accessScopeService.getCurrentBranchIdRequired(accessScopeService.getCurrentUser());
        LocalDate start = startDate != null ? startDate : LocalDate.now().withDayOfMonth(1);
        LocalDate end = endDate != null ? endDate : LocalDate.now();

        List<Order> orders = orderRepository.findByTenantIdAndBranchIdAndCreatedAtBetween(
                com.possaas.config.TenantContext.getTenantId(),
                branchId,
                start.atStartOfDay(),
                end.atTime(LocalTime.MAX));

        BigDecimal totalRevenue = orders.stream().map(Order::getTotalAmount).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        int transactionCount = orders.size();

        Map<Long, TopAccumulator> topMap = new LinkedHashMap<>();
        for (Order order : orders) {
            if (order.getLineItems() == null)
                continue;
            order.getLineItems().forEach(li -> {
                TopAccumulator acc = topMap.computeIfAbsent(li.getProduct().getId(),
                        id -> new TopAccumulator(li.getProduct().getName(), li.getProduct().getSku()));
                acc.quantity += li.getQuantity();
                acc.revenue = acc.revenue.add(BigDecimal.valueOf(li.getLineTotal()));
            });
        }

        List<TopProductResponse> topProducts = topMap.entrySet().stream()
                .map(e -> TopProductResponse.builder().id(e.getKey()).name(e.getValue().name).sku(e.getValue().sku)
                        .quantitySold(e.getValue().quantity).revenue(e.getValue().revenue).build())
                .sorted(Comparator.comparing(TopProductResponse::getQuantitySold).reversed())
                .limit(10)
                .toList();

        List<Payment> payments = paymentRepository.findByDateRange(
                com.possaas.config.TenantContext.getTenantId(),
                start.atStartOfDay(),
                end.atTime(LocalTime.MAX));

        Map<String, BigDecimal> paymentTotals = new HashMap<>();
        for (Payment payment : payments) {
            if (payment.getStatus() != PaymentStatus.SUCCESS)
                continue;
            if (payment.getOrder() == null || payment.getOrder().getBranch() == null
                    || !branchId.equals(payment.getOrder().getBranch().getId()))
                continue;
            paymentTotals.merge(payment.getMethod().name(), payment.getAmount(), BigDecimal::add);
        }
        BigDecimal grand = paymentTotals.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        List<PaymentDistributionResponse> paymentBreakdown = paymentTotals.entrySet().stream()
                .map(e -> PaymentDistributionResponse.builder()
                        .method(e.getKey())
                        .amount(e.getValue())
                        .percentage(grand.compareTo(BigDecimal.ZERO) > 0
                                ? e.getValue().multiply(BigDecimal.valueOf(100)).divide(grand, 2, RoundingMode.HALF_UP)
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
        Long branchId = accessScopeService.getCurrentBranchIdRequired(accessScopeService.getCurrentUser());
        LocalDate start = startDate != null ? startDate : LocalDate.now().withDayOfMonth(1);
        LocalDate end = endDate != null ? endDate : LocalDate.now();

        return paymentRepository.findByDateRange(
                com.possaas.config.TenantContext.getTenantId(),
                start.atStartOfDay(),
                end.atTime(LocalTime.MAX)).stream()
                .filter(p -> p.getOrder() != null && p.getOrder().getBranch() != null
                        && branchId.equals(p.getOrder().getBranch().getId()))
                .filter(p -> method == null || p.getMethod().name().equalsIgnoreCase(method))
                .filter(p -> status == null || p.getStatus().name().equalsIgnoreCase(status))
                .sorted(Comparator.comparing(Payment::getCreatedAt).reversed())
                .map(p -> new PaymentAuditLogResponse(
                        p.getId(), p.getMethod().name(), p.getAmount(), p.getStatus().name(), p.getCreatedAt(),
                        p.getTransactionId(),
                        p.getOrder() != null ? p.getOrder().getOrderNumber() : null))
                .toList();
    }

    public byte[] exportDashboardCsv(LocalDate startDate, LocalDate endDate) {
        SalesReportResponse report = getSalesReport(startDate, endDate);
        List<PaymentAuditLogResponse> audit = getPaymentAuditLog(startDate, endDate, null, null);
        List<String[]> rows = new ArrayList<>();
        rows.add(new String[] { "Branch Sales Report" });
        rows.add(new String[] { "Start Date", String.valueOf(report.getStartDate()) });
        rows.add(new String[] { "End Date", String.valueOf(report.getEndDate()) });
        rows.add(new String[] { "Total Revenue", report.getTotalRevenue().toPlainString() });
        rows.add(new String[] { "Transaction Count", String.valueOf(report.getTransactionCount()) });
        rows.add(new String[] {});
        rows.add(new String[] { "Top Products" });
        rows.add(new String[] { "Product", "SKU", "Quantity Sold", "Revenue" });
        report.getTopProducts().forEach(p -> rows.add(new String[] { p.getName(), p.getSku(),
                String.valueOf(p.getQuantitySold()), p.getRevenue().toPlainString() }));
        rows.add(new String[] {});
        rows.add(new String[] { "Payment Audit Log" });
        rows.add(new String[] { "Method", "Amount", "Status", "Timestamp", "Gateway Ref", "Order" });
        audit.forEach(a -> rows
                .add(new String[] { a.method(), a.amount().toPlainString(), a.status(), String.valueOf(a.timestamp()),
                        String.valueOf(a.gatewayReference()), String.valueOf(a.orderNumber()) }));
        return toCsv(rows);
    }

    public byte[] exportDashboardPdf(LocalDate startDate, LocalDate endDate) {
        SalesReportResponse report = getSalesReport(startDate, endDate);
        List<PaymentAuditLogResponse> audit = getPaymentAuditLog(startDate, endDate, null, null);

        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                float y = 780;
                y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 16, "Branch Sales Report");
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
                    if (y < 80)
                        break;
                }
                y -= 8;
                y = writeLine(content, y, PDType1Font.HELVETICA_BOLD, 12, "Payment Audit Log");
                for (PaymentAuditLogResponse a : audit.stream().limit(12).toList()) {
                    y = writeLine(content, y, PDType1Font.HELVETICA, 9,
                            a.timestamp() + " | " + a.method() + " | " + a.amount() + " | " + a.status() + " | "
                                    + (a.gatewayReference() == null ? "N/A" : a.gatewayReference()));
                    if (y < 60)
                        break;
                }
            }
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate branch dashboard PDF", e);
        }
    }

    @Transactional
    public ImportResultResponse importDashboardCsv(MultipartFile file) {
        try {
            int rows = parseCsv(file).size();
            return new ImportResultResponse(rows, rows, 0, List.of());
        } catch (Exception e) {
            return new ImportResultResponse(0, 0, 0, List.of("CSV parse failed: " + e.getMessage()));
        }
    }

    private List<Map<String, String>> parseCsv(MultipartFile file) throws IOException {
        String content = new String(file.getBytes(), StandardCharsets.UTF_8);
        String[] lines = content.replace("\r", "").split("\n");
        if (lines.length < 2)
            return List.of();

        String[] headers = split(lines[0]);
        List<Map<String, String>> result = new ArrayList<>();
        for (int i = 1; i < lines.length; i++) {
            if (lines[i].isBlank())
                continue;
            String[] values = split(lines[i]);
            Map<String, String> row = new HashMap<>();
            for (int c = 0; c < headers.length; c++) {
                row.put(headers[c].trim(), c < values.length ? values[c].trim() : "");
            }
            result.add(row);
        }
        return result;
    }

    private String[] split(String line) {
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

    private String required(Map<String, String> row, String key) {
        String value = row.getOrDefault(key, "").trim();
        if (value.isBlank())
            throw new IllegalArgumentException(key + " is required");
        return value;
    }

    private byte[] toCsv(List<String[]> rows) {
        StringBuilder sb = new StringBuilder();
        for (String[] row : rows) {
            String line = java.util.Arrays.stream(row)
                    .map(v -> {
                        if (v == null)
                            return "";
                        if (v.contains(",") || v.contains("\"") || v.contains("\n")) {
                            return "\"" + v.replace("\"", "\"\"") + "\"";
                        }
                        return v;
                    })
                    .collect(Collectors.joining(","));
            sb.append(line).append("\n");
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private float writeLine(PDPageContentStream content, float y, PDType1Font font, int size, String text)
            throws IOException {
        content.beginText();
        content.setFont(font, size);
        content.newLineAtOffset(40, y);
        content.showText(text.length() > 110 ? text.substring(0, 110) : text);
        content.endText();
        return y - (size + 5);
    }

    private static class TopAccumulator {
        private final String name;
        private final String sku;
        private int quantity;
        private BigDecimal revenue;

        private TopAccumulator(String name, String sku) {
            this.name = name;
            this.sku = sku;
            this.quantity = 0;
            this.revenue = BigDecimal.ZERO;
        }
    }
}
