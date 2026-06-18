package com.possaas.service.order;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import java.io.IOException;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import com.possaas.config.TenantContext;
import com.possaas.domain.branch.BranchSettings;
import com.possaas.domain.customer.Customer;
import com.possaas.domain.notification.NotificationType;
import com.possaas.domain.order.Order;
import com.possaas.domain.order.OrderLineItem;
import com.possaas.domain.order.RefundRequestStatus;
import com.possaas.domain.order.OrderStatus;
import com.possaas.domain.order.VoidRequest;
import com.possaas.domain.order.VoidRequestStatus;
import com.possaas.dto.request.RefundItemRequest;
import com.possaas.domain.payment.Payment;
import com.possaas.domain.payment.PaymentMethod;
import com.possaas.domain.payment.PaymentStatus;
import com.possaas.domain.product.Product;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.dto.request.CreateOrderRequest;
import com.possaas.dto.request.OrderLineItemRequest;
import com.possaas.dto.request.SplitPaymentRequest;
import com.possaas.dto.request.ValidateDiscountRequest;
import com.possaas.dto.request.VoidTransactionRequest;
import com.possaas.dto.response.OrderDetailDto;
import com.possaas.dto.response.OrderDto;
import com.possaas.dto.response.OrderLineItemDto;
import com.possaas.dto.response.OrderSummaryDto;
import com.possaas.dto.response.PaymentDto;
import com.possaas.dto.response.ValidateDiscountResponse;
import com.possaas.repository.BranchSettingsRepository;
import com.possaas.repository.CustomerRepository;
import com.possaas.repository.OrderRepository;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.RefundRequestRepository;
import com.possaas.repository.ShiftRepository;
import com.possaas.repository.UserRepository;
import com.possaas.repository.VoidRequestRepository;
import com.possaas.repository.BranchRepository;
import com.possaas.domain.branch.Branch;
import com.possaas.service.inventory.InventoryService;
import com.possaas.service.notification.EmailService;
import com.possaas.service.customer.CustomerService;
import com.possaas.domain.customer.LoyaltyTier;
import com.possaas.service.notification.NotificationService;
import com.possaas.service.audit.AuditLogService;
import com.possaas.service.payment.PaymentService;
import com.possaas.service.security.AccessScopeService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.thymeleaf.context.Context;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
@Slf4j
public class OrderService {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final InventoryService inventoryService;
    private final UserRepository userRepository;
    private final ShiftRepository shiftRepository;
    private final ProductRepository productRepository;
    private final BranchSettingsRepository branchSettingsRepository;
    private final OrderNumberGenerator orderNumberGenerator;
    private final EmailService emailService;
    private final CustomerService customerService;
    private final RefundRequestRepository refundRequestRepository;
    private final VoidRequestRepository voidRequestRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final BranchRepository branchRepository;
    private final PaymentService paymentService;
    private final AccessScopeService accessScopeService;
    private final com.possaas.repository.TenantRepository tenantRepository;

    public OrderService(OrderRepository orderRepository,
                        CustomerRepository customerRepository,
                        InventoryService inventoryService,
                        UserRepository userRepository,
                        ShiftRepository shiftRepository,
                        ProductRepository productRepository,
                        BranchSettingsRepository branchSettingsRepository,
                        OrderNumberGenerator orderNumberGenerator,
                        EmailService emailService,
                        CustomerService customerService,
                        RefundRequestRepository refundRequestRepository,
                        VoidRequestRepository voidRequestRepository,
                        NotificationService notificationService,
                        AuditLogService auditLogService,
                        BranchRepository branchRepository,
                        PaymentService paymentService,
                        AccessScopeService accessScopeService,
                        com.possaas.repository.TenantRepository tenantRepository) {
        this.orderRepository = orderRepository;
        this.customerRepository = customerRepository;
        this.inventoryService = inventoryService;
        this.userRepository = userRepository;
        this.shiftRepository = shiftRepository;
        this.productRepository = productRepository;
        this.branchSettingsRepository = branchSettingsRepository;
        this.orderNumberGenerator = orderNumberGenerator;
        this.emailService = emailService;
        this.customerService = customerService;
        this.refundRequestRepository = refundRequestRepository;
        this.voidRequestRepository = voidRequestRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
        this.branchRepository = branchRepository;
        this.paymentService = paymentService;
        this.accessScopeService = accessScopeService;
        this.tenantRepository = tenantRepository;
    }
    // CREATE ORDER (Single Payment)
    // =====================================================
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OrderDto createOrder(CreateOrderRequest request, Long customerId, Long cashierId) {

        String tenantId = TenantContext.getTenantId();

        // Customer is optional - can be null for walk-in customers
        Customer customer = null;
        if (customerId != null) {
            customer = customerRepository.findByIdAndTenantId(customerId, tenantId)
                    .orElseThrow(() -> new RuntimeException("Customer not found"));
        }

        User cashier = userRepository.findById(cashierId)
                .orElseThrow(() -> new RuntimeException("Cashier not found"));
        enforceActiveShiftForCashier(cashier);

        Map<Long, Product> productMap = fetchProducts(request.getItems());

        Order order = buildBaseOrder(cashier, tenantId, request.getBranchId());
        applyCustomerSnapshot(order, customer);

        BigDecimal subtotal = buildLineItemsAndDeductStock(order, request.getItems(), productMap);

        BigDecimal finalTotal = calculateTotals(order, subtotal, request);

        // Payment Handling
        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setAmount(finalTotal);
        payment.setTenantId(tenantId);

        PaymentMethod method = PaymentMethod.CASH;
        if (request.getPaymentMethod() != null) {
            try {
                method = PaymentMethod.valueOf(request.getPaymentMethod().toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid payment method {}, defaulting to CASH", request.getPaymentMethod());
            }
        }

        payment.setMethod(method);
        payment.setStatus(PaymentStatus.SUCCESS);
        if ((method == PaymentMethod.CARD || method == PaymentMethod.UPI)
                && (request.getPaymentReference() == null || request.getPaymentReference().isBlank())) {
            throw new RuntimeException("Payment declined");
        }
        if (method == PaymentMethod.CARD || method == PaymentMethod.UPI) {
            payment.setTransactionId(request.getPaymentReference());
        }
        order.setStatus(OrderStatus.COMPLETED);

        if (method == PaymentMethod.CASH && request.getAmountPaid() != null) {
            payment.setAmountTendered(request.getAmountPaid());
            payment.setChangeAmount(request.getAmountPaid().subtract(finalTotal));
        }

        order.setPayments(new ArrayList<>());
        order.getPayments().add(payment);

        Order savedOrder = orderRepository.save(order);

        String branchName = savedOrder.getBranch() != null ? savedOrder.getBranch().getName() : "N/A";
        auditLogService.log("ORDER_CREATED", "ORDER", savedOrder.getId().toString(), 
            String.format("Created order: %s in branch: %s (Total: %s, Discount: %s Rupees)", 
                savedOrder.getOrderNumber(), branchName, savedOrder.getTotalAmount(), 
                savedOrder.getDiscountAmount()));

        // ================= SEND EMAIL =================
        String targetEmail = request.getCustomerEmail();

        // Fallback to saved email if cashier didn’t enter one
        if ((targetEmail == null || targetEmail.isBlank()) && customer != null) {
            targetEmail = customer.getEmail();
        }

        if (targetEmail != null && !targetEmail.isBlank()) {
            try {
                Context context = new Context();
                context.setVariable("name", customer != null ? getCustomerFullName(customer) : "Guest Customer");
                context.setVariable("orderNumber",
                        savedOrder.getOrderNumber());
                context.setVariable("amount",
                        savedOrder.getTotalAmount());
                context.setVariable("branchName", 
                        savedOrder.getBranch() != null ? savedOrder.getBranch().getName() : "Main Branch");
                context.setVariable("tenantName", 
                        tenantRepository.findById(tenantId).map(com.possaas.domain.tenant.Tenant::getName).orElse("POS SaaS System"));

                emailService.sendHtmlEmail(
                        targetEmail,
                        "Order Confirmed: "
                                + savedOrder.getOrderNumber(),
                        "email/order-confirmation",
                        context);

                log.info("Order confirmation email sent to {}",
                        targetEmail);

            } catch (Exception e) {
                log.error("Failed to send order confirmation email",
                        e);
            }
        }

        // Update Customer Loyalty Statistics
        if (customer != null) {
            try {
                customerService.updatePurchaseStatistics(customer.getId(), finalTotal);
                customerService.calculateAndAwardPointsForPurchase(customer.getId(), finalTotal, savedOrder.getId());
            } catch (Exception e) {
                log.error("Failed to update customer loyalty statistics for customer ID: {}", customer.getId(), e);
            }
        }

        return mapToDto(savedOrder);
    }

    // =====================================================
    // SPLIT PAYMENT ORDER
    // =====================================================
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OrderDto createSplitPaymentOrder(SplitPaymentRequest request, Long cashierId) {

        String tenantId = TenantContext.getTenantId();

        Customer customer = customerRepository.findByIdAndTenantId(request.getCustomerId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        User cashier = userRepository.findById(cashierId)
                .orElseThrow(() -> new RuntimeException("Cashier not found"));

        Map<Long, Product> productMap = fetchProducts(request.getLineItems());

        Order order = buildBaseOrder(cashier, tenantId, request.getBranchId());
        applyCustomerSnapshot(order, customer);

        BigDecimal subtotal = buildLineItemsAndDeductStock(order, request.getLineItems(), productMap);

        // Create a temporary CreateOrderRequest to pass discount info to
        // calculateTotals
        CreateOrderRequest tempRequest = new CreateOrderRequest();
        tempRequest.setDiscountType(request.getDiscountType());
        tempRequest.setDiscountPercent(request.getDiscountPercent());
        tempRequest.setDiscountAmount(request.getDiscountAmount());

        BigDecimal finalTotal = calculateTotals(order, subtotal, tempRequest);

        BigDecimal paymentTotal = request.getPayments()
                .stream()
                .map(SplitPaymentRequest.PaymentDetail::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        paymentTotal = toMoneyScale(paymentTotal);
        finalTotal = toMoneyScale(finalTotal);

        if (paymentTotal.subtract(finalTotal).abs().compareTo(new BigDecimal("0.01")) > 0) {
            throw new RuntimeException("Split payment total does not match order total");
        }

        List<Payment> payments = new ArrayList<>();

        for (SplitPaymentRequest.PaymentDetail pd : request.getPayments()) {
            Payment payment = new Payment();
            payment.setOrder(order);
            payment.setAmount(pd.getAmount());
            payment.setMethod(PaymentMethod.valueOf(pd.getMethod().toUpperCase()));
            payment.setStatus(PaymentStatus.SUCCESS);
            payment.setTenantId(tenantId);
            payment.setTransactionId(pd.getTransactionId());
            payments.add(payment);
        }

        order.setPayments(payments);

        Order saved = orderRepository.save(order);
        String branchName = saved.getBranch() != null ? saved.getBranch().getName() : "N/A";

        auditLogService.log("SPLIT_ORDER_CREATED", "ORDER", saved.getId().toString(), 
            String.format("Created split payment order: %s in branch: %s (Total: %s, Discount: %s Rupees)", 
                saved.getOrderNumber(), branchName, saved.getTotalAmount(), 
                saved.getDiscountAmount()));

        // ================= SEND EMAIL =================
        String targetEmail = customer.getEmail();
        if (targetEmail != null && !targetEmail.isBlank()) {
            try {
                Context context = new Context();
                context.setVariable("name", getCustomerFullName(customer));
                context.setVariable("orderNumber", saved.getOrderNumber());
                context.setVariable("amount", saved.getTotalAmount());
                context.setVariable("branchName", 
                        saved.getBranch() != null ? saved.getBranch().getName() : "Main Branch");
                context.setVariable("tenantName", 
                        tenantRepository.findById(tenantId).map(com.possaas.domain.tenant.Tenant::getName).orElse("POS SaaS System"));

                emailService.sendHtmlEmail(
                        targetEmail,
                        "Order Confirmed: " + saved.getOrderNumber(),
                        "email/order-confirmation",
                        context);

                log.info("Order confirmation email sent to {}", targetEmail);
            } catch (Exception e) {
                log.error("Failed to send order confirmation email", e);
            }
        }

        // Update Customer Loyalty Statistics
        try {
            customerService.updatePurchaseStatistics(customer.getId(), finalTotal);
            customerService.calculateAndAwardPointsForPurchase(customer.getId(), finalTotal, saved.getId());
        } catch (Exception e) {
            log.error("Failed to update customer loyalty statistics for customer ID: {}", customer.getId(), e);
        }

        return mapToDto(saved);
    }

    // =====================================================
    // VOID TRANSACTION (APPROVAL FLOW)
    // =====================================================
    @Transactional
    public void requestVoidApproval(Long orderId, VoidTransactionRequest request, Long cashierId) {
        String tenantId = TenantContext.getTenantId();

        User cashier = userRepository.findById(cashierId)
                .orElseThrow(() -> new RuntimeException("Cashier not found"));

        Order order = orderRepository.findByIdWithDetails(orderId, tenantId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!Objects.equals(order.getCashier().getId(), cashierId)) {
            throw new RuntimeException("You can request void only for your own orders");
        }

        if (order.getStatus() != OrderStatus.COMPLETED) {
            throw new RuntimeException("Only paid/completed orders can be voided");
        }

        if (voidRequestRepository.existsByOrder_IdAndStatus(order.getId(), VoidRequestStatus.PENDING)) {
            throw new RuntimeException("A pending void request already exists for this order");
        }

        enforceVoidWithinCurrentShift(order, cashier);

        VoidRequest voidRequest = new VoidRequest();
        voidRequest.setOrder(order);
        voidRequest.setRequestedByUserId(cashierId);
        voidRequest.setReason(request.getReason() != null ? request.getReason().trim() : "");
        voidRequest.setStatus(VoidRequestStatus.PENDING);
        voidRequestRepository.save(voidRequest);

        order.setStatus(OrderStatus.VOID_REQUESTED);
        order.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(order);

        auditLogService.log(
                "VOID_REQUESTED",
                "ORDER",
                order.getId().toString(),
                String.format("Cashier requested void for order %s (reason: %s)",
                        order.getOrderNumber(),
                        voidRequest.getReason() == null || voidRequest.getReason().isBlank()
                                ? "N/A"
                                : voidRequest.getReason()));

        notifyManagersForVoidApproval(tenantId, order, voidRequest, cashier);
    }

    @Transactional
    public OrderDto approveVoidRequest(Long voidRequestId, Long managerId, String comment) {
        String tenantId = TenantContext.getTenantId();

        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new RuntimeException("Manager not found"));

        if (manager.getRole() != Role.ROLE_BRANCH_MANAGER) {
            throw new RuntimeException("Only branch manager can approve void requests");
        }

        VoidRequest voidRequest = voidRequestRepository.findByIdWithOrderDetails(voidRequestId, tenantId)
                .orElseThrow(() -> new RuntimeException("Void request not found"));

        if (voidRequest.getStatus() != VoidRequestStatus.PENDING) {
            throw new RuntimeException("Void request already processed");
        }

        Order order = voidRequest.getOrder();
        if (manager.getRole() == Role.ROLE_BRANCH_MANAGER && manager.getBranch() != null && order.getBranch() != null
                && !Objects.equals(manager.getBranch().getId(), order.getBranch().getId())) {
            throw new RuntimeException("You can approve requests only for your branch");
        }

        finalizeOrderVoid(order);

        voidRequest.setStatus(VoidRequestStatus.APPROVED);
        voidRequest.setReviewedByUserId(managerId);
        voidRequest.setReviewedAt(LocalDateTime.now());
        voidRequest.setReviewComment(comment);
        voidRequestRepository.save(voidRequest);

        auditLogService.log("VOID_REQUEST_APPROVED", "ORDER", order.getId().toString(), 
            String.format("Approved void request for order: %s in branch: %s", 
                order.getOrderNumber(), 
                order.getBranch() != null ? order.getBranch().getName() : "N/A"));

        notifyCashierVoidDecision(order, voidRequest, true);
        return mapToDto(order);
    }

    @Transactional
    public void declineVoidRequest(Long voidRequestId, Long managerId, String comment) {
        String tenantId = TenantContext.getTenantId();

        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new RuntimeException("Manager not found"));

        if (manager.getRole() != Role.ROLE_BRANCH_MANAGER) {
            throw new RuntimeException("Only branch manager can decline void requests");
        }

        VoidRequest voidRequest = voidRequestRepository.findByIdWithOrderDetails(voidRequestId, tenantId)
                .orElseThrow(() -> new RuntimeException("Void request not found"));

        if (voidRequest.getStatus() != VoidRequestStatus.PENDING) {
            throw new RuntimeException("Void request already processed");
        }

        Order order = voidRequest.getOrder();
        if (manager.getRole() == Role.ROLE_BRANCH_MANAGER && manager.getBranch() != null && order.getBranch() != null
                && !Objects.equals(manager.getBranch().getId(), order.getBranch().getId())) {
            throw new RuntimeException("You can decline requests only for your branch");
        }

        order.setStatus(OrderStatus.COMPLETED);
        order.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(order);

        voidRequest.setStatus(VoidRequestStatus.DECLINED);
        voidRequest.setReviewedByUserId(managerId);
        voidRequest.setReviewedAt(LocalDateTime.now());
        voidRequest.setReviewComment(comment);
        voidRequestRepository.save(voidRequest);

        notifyCashierVoidDecision(order, voidRequest, false);
    }

    // Legacy direct-void API for manager/store-admin
    @Transactional
    public OrderDto voidTransaction(Long orderId,
            VoidTransactionRequest request,
            Long managerId) {

        String tenantId = TenantContext.getTenantId();
        User actor = userRepository.findById(managerId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (actor.getRole() != Role.ROLE_BRANCH_MANAGER && actor.getRole() != Role.ROLE_STORE_ADMIN) {
            throw new RuntimeException("Only manager/store admin can void a transaction directly");
        }

        Order order = orderRepository.findByIdWithDetails(orderId, tenantId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new RuntimeException("Order already cancelled");
        }

        finalizeOrderVoid(order);
        return mapToDto(order);
    }

    // =====================================================
    // PROCESS REFUND
    // =====================================================
    @Transactional
    public OrderDto processRefund(com.possaas.dto.request.RefundRequest request) {
        String tenantId = TenantContext.getTenantId();

        Order order = orderRepository.findByIdWithDetails(request.getOrderId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (order.getStatus() != OrderStatus.COMPLETED
                && order.getStatus() != OrderStatus.PARTIAL_REFUND
                && order.getStatus() != OrderStatus.REFUND_REQUESTED) {
            throw new RuntimeException("Only completed, partial refund, or refund-requested orders can be refunded");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new RuntimeException("At least one refund item is required");
        }

        Map<Long, Integer> remainingQtyByProduct = order.getLineItems().stream()
                .collect(Collectors.groupingBy(
                        item -> item.getProduct().getId(),
                        Collectors.summingInt(OrderLineItem::getQuantity)));

        Map<Long, Integer> refundQtyByProduct = new java.util.HashMap<>();
        for (com.possaas.dto.request.RefundItemRequest itemReq : request.getItems()) {
            if (itemReq.getProductId() == null || itemReq.getQuantity() == null || itemReq.getQuantity() <= 0) {
                throw new RuntimeException("Invalid refund item payload");
            }

            Integer remainingQty = remainingQtyByProduct.get(itemReq.getProductId());
            if (remainingQty == null) {
                throw new RuntimeException("Refund item does not belong to this order");
            }

            int requested = refundQtyByProduct.getOrDefault(itemReq.getProductId(), 0) + itemReq.getQuantity();
            if (requested > remainingQty) {
                throw new RuntimeException("Refund quantity exceeds remaining quantity");
            }
            refundQtyByProduct.put(itemReq.getProductId(), requested);
        }

        BigDecimal refundAmount = calculateRefundAmount(order, refundQtyByProduct, remainingQtyByProduct);

        boolean fullRefund = remainingQtyByProduct.entrySet().stream()
                .allMatch(entry -> refundQtyByProduct.getOrDefault(entry.getKey(), 0).equals(entry.getValue()));

        ensureLineItemsSnapshot(order);
        try {
            paymentService.refundOrderPayment(order, refundAmount, request.getReason());
        } catch (Exception ex) {
            log.warn("Payment refund failed for order {}. Continuing cashier refund flow. reason={}",
                    order.getId(), ex.getMessage(), ex);
        }

        refundQtyByProduct.forEach(inventoryService::addStock);
        applyRefundToOrderLineItems(order, refundQtyByProduct);
        recalculateOrderTotalsFromRemainingItems(order);

        order.setStatus(fullRefund ? OrderStatus.REFUNDED : OrderStatus.PARTIAL_REFUND);
        order.setUpdatedAt(LocalDateTime.now());

        Order saved = orderRepository.save(order);
        
        auditLogService.log("ORDER_REFUNDED", "ORDER", saved.getId().toString(), 
            String.format("Refunded order items for: %s in branch: %s (Status: %s)", 
                saved.getOrderNumber(), 
                saved.getBranch() != null ? saved.getBranch().getName() : "N/A",
                saved.getStatus()));
            
        return mapToDto(saved);
    }

    // =====================================================
    // REFUND TRANSACTION (APPROVAL FLOW)
    // =====================================================
    @Transactional
    public void requestRefundApproval(com.possaas.dto.request.RefundRequest request, Long cashierId) {
        String tenantId = TenantContext.getTenantId();

        User cashier = userRepository.findById(cashierId)
                .orElseThrow(() -> new RuntimeException("Cashier not found"));

        Order order = orderRepository.findByIdWithDetails(request.getOrderId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!Objects.equals(order.getCashier().getId(), cashierId)) {
            throw new RuntimeException("You can request refund only for your own orders");
        }

        if (order.getStatus() != OrderStatus.COMPLETED && order.getStatus() != OrderStatus.PARTIAL_REFUND) {
            throw new RuntimeException("Only completed or partial refund orders can be refunded");
        }

        if (refundRequestRepository.existsByOrder_IdAndStatus(order.getId(), RefundRequestStatus.PENDING)) {
            throw new RuntimeException("A pending refund request already exists for this order");
        }

        validateRefundRequest(order, request);

        com.possaas.domain.order.RefundRequest refundRequest = new com.possaas.domain.order.RefundRequest();
        refundRequest.setOrder(order);
        refundRequest.setRequestedByUserId(cashierId);
        refundRequest.setOriginalOrderStatus(order.getStatus());
        refundRequest.setReason(request.getReason() != null ? request.getReason().trim() : "");
        refundRequest.setCustomReason(request.getCustomReason());
        refundRequest.setRefundAmount(request.getRefundAmount());
        refundRequest.setItemsJson(serializeRefundItems(request.getItems()));
        refundRequest.setStatus(RefundRequestStatus.PENDING);
        refundRequestRepository.save(refundRequest);

        order.setStatus(OrderStatus.REFUND_REQUESTED);
        order.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(order);

        auditLogService.log(
                "REFUND_REQUESTED",
                "ORDER",
                order.getId().toString(),
                String.format("Cashier requested refund for order %s (reason: %s)",
                        order.getOrderNumber(),
                        refundRequest.getReason() == null || refundRequest.getReason().isBlank()
                                ? "N/A"
                                : refundRequest.getReason()));

        notifyManagersForRefundApproval(tenantId, order, refundRequest, cashier);
    }

    @Transactional
    public OrderDto approveRefundRequest(Long refundRequestId, Long managerId, String comment) {
        String tenantId = TenantContext.getTenantId();

        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new RuntimeException("Manager not found"));

        if (manager.getRole() != Role.ROLE_BRANCH_MANAGER) {
            throw new RuntimeException("Only branch manager can approve refund requests");
        }

        com.possaas.domain.order.RefundRequest refundRequest = refundRequestRepository
                .findByIdWithOrderDetails(refundRequestId, tenantId)
                .orElseThrow(() -> new RuntimeException("Refund request not found"));

        if (refundRequest.getStatus() != RefundRequestStatus.PENDING) {
            throw new RuntimeException("Refund request already processed");
        }

        Order order = refundRequest.getOrder();
        if (manager.getBranch() != null && order.getBranch() != null
                && !Objects.equals(manager.getBranch().getId(), order.getBranch().getId())) {
            throw new RuntimeException("You can approve requests only for your branch");
        }

        com.possaas.dto.request.RefundRequest approvalPayload = rebuildRefundRequest(order, refundRequest);
        OrderDto result = processRefund(approvalPayload);

        refundRequest.setStatus(RefundRequestStatus.APPROVED);
        refundRequest.setReviewedByUserId(managerId);
        refundRequest.setReviewedAt(LocalDateTime.now());
        refundRequest.setReviewComment(comment);
        refundRequestRepository.save(refundRequest);

        auditLogService.log("REFUND_REQUEST_APPROVED", "ORDER", order.getId().toString(),
                String.format("Approved refund request for order: %s in branch: %s",
                        order.getOrderNumber(),
                        order.getBranch() != null ? order.getBranch().getName() : "N/A"));

        notifyCashierRefundDecision(order, refundRequest, true);
        return result;
    }

    @Transactional
    public void declineRefundRequest(Long refundRequestId, Long managerId, String comment) {
        String tenantId = TenantContext.getTenantId();

        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new RuntimeException("Manager not found"));

        if (manager.getRole() != Role.ROLE_BRANCH_MANAGER) {
            throw new RuntimeException("Only branch manager can decline refund requests");
        }

        com.possaas.domain.order.RefundRequest refundRequest = refundRequestRepository
                .findByIdWithOrderDetails(refundRequestId, tenantId)
                .orElseThrow(() -> new RuntimeException("Refund request not found"));

        if (refundRequest.getStatus() != RefundRequestStatus.PENDING) {
            throw new RuntimeException("Refund request already processed");
        }

        Order order = refundRequest.getOrder();
        if (manager.getBranch() != null && order.getBranch() != null
                && !Objects.equals(manager.getBranch().getId(), order.getBranch().getId())) {
            throw new RuntimeException("You can decline requests only for your branch");
        }

        order.setStatus(refundRequest.getOriginalOrderStatus());
        order.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(order);

        refundRequest.setStatus(RefundRequestStatus.DECLINED);
        refundRequest.setReviewedByUserId(managerId);
        refundRequest.setReviewedAt(LocalDateTime.now());
        refundRequest.setReviewComment(comment);
        refundRequestRepository.save(refundRequest);

        notifyCashierRefundDecision(order, refundRequest, false);
    }

    // =====================================================
    // EMAIL RECEIPT
    // =====================================================
    @Transactional(readOnly = true)
    public void emailReceipt(Long orderId, String email) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        log.info("Sending receipt of order {} to {}", order.getOrderNumber(), email);

        try {

            // Show payment breakdown for split payments (and keep it optional for normal
            // orders).
            BigDecimal cashAmount = BigDecimal.ZERO;
            BigDecimal cardAmount = BigDecimal.ZERO;
            if (order.getPayments() != null) {
                for (Payment payment : order.getPayments()) {
                    if (payment == null || payment.getAmount() == null)
                        continue;
                    if (payment.getStatus() != null && payment.getStatus() != PaymentStatus.SUCCESS)
                        continue;

                    if (payment.getMethod() == PaymentMethod.CASH) {
                        cashAmount = cashAmount.add(payment.getAmount());
                    } else if (payment.getMethod() == PaymentMethod.CARD) {
                        cardAmount = cardAmount.add(payment.getAmount());
                    }
                }
            }

            Context context = new Context();
            context.setVariable("name", order.getCustomerName() != null ? order.getCustomerName() : "Guest");
            context.setVariable("orderNumber", order.getOrderNumber());
            context.setVariable("amount", order.getTotalAmount());
            context.setVariable("branchName", 
                    order.getBranch() != null ? order.getBranch().getName() : "Main Branch");
            context.setVariable("tenantName", 
                    tenantRepository.findById(order.getTenantId()).map(com.possaas.domain.tenant.Tenant::getName).orElse("POS SaaS System"));
            context.setVariable("date", order.getCreatedAt());
            context.setVariable("cashAmount", cashAmount.compareTo(BigDecimal.ZERO) > 0 ? cashAmount : null);
            context.setVariable("cardAmount", cardAmount.compareTo(BigDecimal.ZERO) > 0 ? cardAmount : null);

            emailService.sendHtmlEmail(
                    email,
                    "Order Receipt: " + order.getOrderNumber(),
                    "email/order-confirmation",
                    context);
        } catch (Exception e) {
            log.error("Failed to email receipt", e);
            throw new RuntimeException("Failed to send email receipt");
        }
    }

    // =====================================================
    // GET MY ORDERS
    // =====================================================
    @Transactional(readOnly = true)
    public Page<OrderSummaryDto> getMyOrders(Long cashierId, LocalDateTime startDate, LocalDateTime endDate,
            Pageable pageable) {
        if (startDate != null && endDate != null) {
            return orderRepository
                    .findByCashierIdAndIsDeletedFalseAndCreatedAtBetweenOrderByCreatedAtDesc(
                            cashierId, startDate, endDate, pageable)
                    .map(this::mapToSummaryDto);
        }

        if (startDate != null) {
            return orderRepository
                    .findByCashierIdAndIsDeletedFalseAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
                            cashierId, startDate, pageable)
                    .map(this::mapToSummaryDto);
        }

        if (endDate != null) {
            return orderRepository
                    .findByCashierIdAndIsDeletedFalseAndCreatedAtLessThanEqualOrderByCreatedAtDesc(
                            cashierId, endDate, pageable)
                    .map(this::mapToSummaryDto);
        }

        return orderRepository
                .findByCashierIdAndIsDeletedFalseOrderByCreatedAtDesc(cashierId, pageable)
                .map(this::mapToSummaryDto);
    }

    @Transactional(readOnly = true)
    public Resource exportMyOrders(Long cashierId, String format, String status, LocalDate startDate,
            LocalDate endDate) {
        LocalDateTime startDateTime = startDate != null ? startDate.atStartOfDay() : LocalDateTime.now().minusMonths(1);
        LocalDateTime endDateTime = endDate != null ? endDate.atTime(LocalTime.MAX) : LocalDateTime.now();

        Page<OrderSummaryDto> page = orderRepository
                .findByCashierIdAndIsDeletedFalseAndCreatedAtBetweenOrderByCreatedAtDesc(
                        cashierId,
                        startDateTime,
                        endDateTime,
                        Pageable.unpaged())
                .map(this::mapToSummaryDto);

        List<OrderSummaryDto> orders = page.getContent();
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            orders = orders.stream()
                    .filter(order -> order.getStatus() != null && order.getStatus().name().equalsIgnoreCase(status))
                    .collect(Collectors.toList());
        }

        if ("pdf".equalsIgnoreCase(format)) {
            return generateOrderSummaryPdf(orders);
        }
        return generateOrderSummaryCsv(orders);
    }

    // =====================================================
    // GET ALL ORDERS
    // =====================================================
    @Transactional(readOnly = true)
    public Page<OrderSummaryDto> getAllOrders(
            LocalDateTime startDate,
            LocalDateTime endDate,
            Long branchId,
            Pageable pageable) {

        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Start date cannot be after end date");
        }

        String tenantId = TenantContext.getTenantId();
        User currentUser = accessScopeService.getCurrentUser();

        if (accessScopeService.isBranchScopedUser(currentUser)) {
            branchId = accessScopeService.getCurrentBranchIdRequired(currentUser);
        }

        if (branchId != null && startDate != null && endDate != null) {
            return orderRepository
                    .findByTenantIdAndBranch_IdAndIsDeletedFalseAndCreatedAtBetweenOrderByCreatedAtDesc(
                            tenantId, branchId, startDate, endDate, pageable)
                    .map(this::mapToSummaryDto);
        }

        if (branchId != null && startDate != null) {
            return orderRepository
                    .findByTenantIdAndBranch_IdAndIsDeletedFalseAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
                            tenantId, branchId, startDate, pageable)
                    .map(this::mapToSummaryDto);
        }

        if (branchId != null && endDate != null) {
            return orderRepository
                    .findByTenantIdAndBranch_IdAndIsDeletedFalseAndCreatedAtLessThanEqualOrderByCreatedAtDesc(
                            tenantId, branchId, endDate, pageable)
                    .map(this::mapToSummaryDto);
        }

        if (branchId != null) {
            return orderRepository
                    .findByTenantIdAndBranch_IdAndIsDeletedFalseOrderByCreatedAtDesc(
                            tenantId, branchId, pageable)
                    .map(this::mapToSummaryDto);
        }

        if (startDate != null && endDate != null) {
            return orderRepository
                    .findByTenantIdAndIsDeletedFalseAndCreatedAtBetweenOrderByCreatedAtDesc(
                            tenantId, startDate, endDate, pageable)
                    .map(this::mapToSummaryDto);
        }

        if (startDate != null) {
            return orderRepository
                    .findByTenantIdAndIsDeletedFalseAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
                            tenantId, startDate, pageable)
                    .map(this::mapToSummaryDto);
        }

        if (endDate != null) {
            return orderRepository
                    .findByTenantIdAndIsDeletedFalseAndCreatedAtLessThanEqualOrderByCreatedAtDesc(
                            tenantId, endDate, pageable)
                    .map(this::mapToSummaryDto);
        }

        return orderRepository
                .findByTenantIdAndIsDeletedFalseOrderByCreatedAtDesc(tenantId, pageable)
                .map(this::mapToSummaryDto);
    }

    // =====================================================
    // GET ORDER BY ID
    // =====================================================
    @Transactional(readOnly = true)
    public OrderDetailDto getOrderById(Long id) {

        String tenantId = TenantContext.getTenantId();

        Order order = orderRepository.findByIdWithDetails(id, tenantId)
                .orElseThrow(() -> new RuntimeException("Order not found or access denied"));

        return mapToDetailDto(order);
    }

    @Transactional(readOnly = true)
    public ValidateDiscountResponse validateDiscount(ValidateDiscountRequest request) {
        String tenantId = TenantContext.getTenantId();
        BranchSettings settings = getBranchSettingsOrDefault(request.getBranchId(), tenantId);

        String discountType = normalizeDiscountType(request.getDiscountType());
        BigDecimal discountPercent = toMoneyScale(defaultBigDecimal(request.getDiscountPercent()));

        if ("FIXED".equals(discountType)) {
            return ValidateDiscountResponse.builder()
                    .allowed(Boolean.TRUE.equals(settings.getDiscountEnabled()))
                    .maxAllowed(defaultBigDecimal(settings.getMaxDiscountPercent()))
                    .message(Boolean.TRUE.equals(settings.getDiscountEnabled())
                            ? ""
                            : "Discounts not allowed for this branch")
                    .build();
        }

        if (!Boolean.TRUE.equals(settings.getDiscountEnabled()) && discountPercent.compareTo(BigDecimal.ZERO) > 0) {
            return ValidateDiscountResponse.builder()
                    .allowed(false)
                    .maxAllowed(defaultBigDecimal(settings.getMaxDiscountPercent()))
                    .message("Discounts not allowed for this branch")
                    .build();
        }

        BigDecimal maxAllowed = defaultBigDecimal(settings.getMaxDiscountPercent());
        boolean allowed = discountPercent.compareTo(maxAllowed) <= 0;

        return ValidateDiscountResponse.builder()
                .allowed(allowed)
                .maxAllowed(maxAllowed)
                .message(allowed ? ""
                        : "Discount exceeds maximum allowed: " + maxAllowed.stripTrailingZeros().toPlainString() + "%")
                .build();
    }

    // =====================================================
    // INTERNAL HELPERS
    // =====================================================

    private Map<Long, Product> fetchProducts(List<OrderLineItemRequest> items) {
        List<Long> productIds = items.stream()
                .map(OrderLineItemRequest::getProductId)
                .distinct()
                .toList();

        List<Product> products = productRepository.findAllById(productIds);

        if (products.size() != productIds.size()) {
            throw new RuntimeException("One or more products not found");
        }

        return products.stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
    }

    private Order buildBaseOrder(User cashier, String tenantId, Long requestBranchId) {
        Order order = new Order();
        order.setOrderNumber(orderNumberGenerator.generate(tenantId));
        order.setTenantId(tenantId);
        order.setUser(null);
        order.setCashier(cashier);
        
        // Always try to associate with current active shift for cashiers
        var activeShift = shiftRepository.findCurrentShiftByEmployee(cashier.getId()).orElse(null);
        if (activeShift != null) {
            order.setShift(activeShift);
        }
        
        // Contextual Branch selection logic:
        if (requestBranchId != null) {
            branchRepository.findByIdAndTenantId(requestBranchId, tenantId)
                .ifPresent(order::setBranch);
        }
        
        // If no explicit branch, and we have a shift, use shift's branch
        if (order.getBranch() == null && activeShift != null && activeShift.getBranchId() != null) {
            branchRepository.findByIdAndTenantId(activeShift.getBranchId(), tenantId)
                .ifPresent(order::setBranch);
        }
        
        // Final fallback to cashier's assigned branch
        if (order.getBranch() == null) {
            order.setBranch(cashier.getBranch());
        }

        order.setStatus(OrderStatus.COMPLETED);
        order.setCreatedAt(LocalDateTime.now());
        return order;
    }

    private void applyCustomerSnapshot(Order order, Customer customer) {
        if (customer == null) {
            order.setCustomerId(null);
            order.setCustomerName(null);
            order.setCustomerEmail(null);
            return;
        }

        order.setCustomerId(customer.getId());
        order.setCustomerName(getCustomerFullName(customer));
        order.setCustomerEmail(customer.getEmail());
    }

    private String getCustomerFullName(Customer customer) {
        String first = Objects.toString(customer.getFirstName(), "").trim();
        String last = Objects.toString(customer.getLastName(), "").trim();
        String full = (first + " " + last).trim();
        return full.isEmpty() ? "Guest" : full;
    }

    private BigDecimal buildLineItemsAndDeductStock(
            Order order,
            List<OrderLineItemRequest> items,
            Map<Long, Product> productMap) {

        List<OrderLineItem> lineItems = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (OrderLineItemRequest itemRequest : items) {

            Product product = productMap.get(itemRequest.getProductId());

            inventoryService.deductInventory(product.getId(), itemRequest.getQuantity());

            BigDecimal price = product.getPrice();
            BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(itemRequest.getQuantity()));

            OrderLineItem lineItem = new OrderLineItem();
            lineItem.setOrder(order);
            lineItem.setProduct(product);
            lineItem.setQuantity(itemRequest.getQuantity());
            lineItem.setPrice(price.doubleValue());
            lineItem.setDiscount(0.0); // Set default discount to 0
            lineItem.setLineTotal(lineTotal.doubleValue());
            lineItem.setDiscountPercent(BigDecimal.ZERO);
            lineItem.setDiscountAmount(BigDecimal.ZERO);
            lineItem.setSubtotalBeforeDiscount(toMoneyScale(lineTotal));
            lineItem.setTaxableAmount(toMoneyScale(lineTotal));
            lineItem.setTaxAmount(BigDecimal.ZERO);
            lineItem.setFinalTotal(toMoneyScale(lineTotal));

            lineItems.add(lineItem);
            subtotal = subtotal.add(lineTotal);
        }

        order.setLineItems(lineItems);
        ensureLineItemsSnapshot(order);
        return subtotal;
    }

    private BigDecimal calculateTotals(Order order, BigDecimal subtotal, CreateOrderRequest request) {
        String tenantId = TenantContext.getTenantId();
        Long branchId = order.getBranch() != null ? order.getBranch().getId() : null;
        BranchSettings settings = getBranchSettingsOrDefault(branchId, tenantId);

        BigDecimal subtotalBeforeDiscount = toMoneyScale(subtotal);
        String discountType = request == null ? null : normalizeDiscountType(request.getDiscountType());
        BigDecimal requestedPercent = request == null ? BigDecimal.ZERO
                : defaultBigDecimal(request.getDiscountPercent());
        BigDecimal requestedAmount = request == null ? BigDecimal.ZERO : defaultBigDecimal(request.getDiscountAmount());

        if (discountType == null) {
            if (requestedPercent.compareTo(BigDecimal.ZERO) > 0) {
                discountType = "PERCENTAGE";
            } else if (requestedAmount.compareTo(BigDecimal.ZERO) > 0) {
                discountType = "FIXED";
            }
        }

        BigDecimal discountAmount = BigDecimal.ZERO;
        BigDecimal appliedDiscountPercent = BigDecimal.ZERO;

        if ("PERCENTAGE".equals(discountType)) {
            validateBranchDiscountRules(settings, requestedPercent, subtotalBeforeDiscount, "PERCENTAGE");
            appliedDiscountPercent = requestedPercent;
            discountAmount = subtotalBeforeDiscount
                    .multiply(requestedPercent)
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        } else if ("FIXED".equals(discountType)) {
            BigDecimal derivedPercent = subtotalBeforeDiscount.compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ZERO
                    : requestedAmount.multiply(new BigDecimal("100"))
                            .divide(subtotalBeforeDiscount, 2, RoundingMode.HALF_UP);

            validateBranchDiscountRules(settings, derivedPercent, subtotalBeforeDiscount, "FIXED");
            appliedDiscountPercent = derivedPercent;
            discountAmount = requestedAmount;
        }

        if (discountAmount.compareTo(subtotalBeforeDiscount) > 0) {
            discountAmount = subtotalBeforeDiscount;
        }

        // Loyalty Discount Logic (Additive)
        BigDecimal loyaltyDiscountAmount = BigDecimal.ZERO;
        BigDecimal loyaltyDiscountPercent = BigDecimal.ZERO;

        if (order.getCustomerId() != null) {
            Customer customer = customerRepository.findById(order.getCustomerId()).orElse(null);
            if (customer != null) {
                Integer totalPurchases = customer.getTotalPurchases() != null ? customer.getTotalPurchases() : 0;
                if (totalPurchases >= 10) {
                    loyaltyDiscountPercent = new BigDecimal("20");
                } else if (totalPurchases >= 5) {
                    loyaltyDiscountPercent = new BigDecimal("10");
                }

                if (loyaltyDiscountPercent.compareTo(BigDecimal.ZERO) > 0) {
                    loyaltyDiscountAmount = subtotalBeforeDiscount
                            .multiply(loyaltyDiscountPercent)
                            .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                }
            }
        }

        // Final Aggregate Discount
        BigDecimal totalDiscountAmount = discountAmount.add(loyaltyDiscountAmount);
        if (totalDiscountAmount.compareTo(subtotalBeforeDiscount) > 0) {
            totalDiscountAmount = subtotalBeforeDiscount;
        }

        BigDecimal taxableAmount = subtotalBeforeDiscount.subtract(totalDiscountAmount).max(BigDecimal.ZERO);
        BigDecimal taxRate = defaultBigDecimal(settings.getTaxRate());
        BigDecimal taxAmount = taxableAmount
                .multiply(taxRate)
                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal finalTotal = taxableAmount.add(taxAmount).setScale(2, RoundingMode.HALF_UP);

        order.setSubtotal(subtotalBeforeDiscount);
        order.setSubtotalBeforeDiscount(subtotalBeforeDiscount);
        order.setDiscountType(discountType);
        // If we have both, we sum them for the order record
        order.setDiscountPercent(appliedDiscountPercent.add(loyaltyDiscountPercent));
        order.setDiscountAmount(toMoneyScale(totalDiscountAmount));
        order.setDiscount(toMoneyScale(totalDiscountAmount)); // backward-compatible existing field
        order.setTaxableAmount(toMoneyScale(taxableAmount));
        order.setTaxAmount(toMoneyScale(taxAmount));
        order.setTax(toMoneyScale(taxAmount)); // backward-compatible existing field
        order.setFinalTotal(finalTotal);
        order.setTotalAmount(finalTotal);
        applyLineItemFinancialBreakdown(order, subtotalBeforeDiscount, totalDiscountAmount, taxAmount);

        return finalTotal;
    }

    private void applyLineItemFinancialBreakdown(
            Order order,
            BigDecimal subtotalBeforeDiscount,
            BigDecimal totalDiscountAmount,
            BigDecimal totalTaxAmount) {

        if (order == null || order.getLineItems() == null || order.getLineItems().isEmpty()) {
            return;
        }

        BigDecimal normalizedSubtotal = defaultBigDecimal(subtotalBeforeDiscount);
        BigDecimal normalizedDiscount = defaultBigDecimal(totalDiscountAmount);
        BigDecimal normalizedTax = defaultBigDecimal(totalTaxAmount);

        BigDecimal remainingDiscount = normalizedDiscount;
        for (int i = 0; i < order.getLineItems().size(); i++) {
            OrderLineItem item = order.getLineItems().get(i);
            BigDecimal itemPrice = item.getPrice() == null ? BigDecimal.ZERO : BigDecimal.valueOf(item.getPrice());
            BigDecimal itemSubtotal = toMoneyScale(itemPrice.multiply(BigDecimal.valueOf(item.getQuantity() == null ? 0 : item.getQuantity())));

            BigDecimal itemDiscount;
            if (normalizedSubtotal.compareTo(BigDecimal.ZERO) <= 0) {
                itemDiscount = BigDecimal.ZERO;
            } else if (i == order.getLineItems().size() - 1) {
                itemDiscount = remainingDiscount.max(BigDecimal.ZERO);
            } else {
                itemDiscount = normalizedDiscount
                        .multiply(itemSubtotal)
                        .divide(normalizedSubtotal, 2, RoundingMode.HALF_UP);
                if (itemDiscount.compareTo(remainingDiscount) > 0) {
                    itemDiscount = remainingDiscount;
                }
            }

            BigDecimal itemTaxable = itemSubtotal.subtract(itemDiscount).max(BigDecimal.ZERO);
            item.setSubtotalBeforeDiscount(itemSubtotal);
            item.setDiscountAmount(toMoneyScale(itemDiscount));
            item.setDiscount(toMoneyScale(itemDiscount).doubleValue());
            item.setTaxableAmount(toMoneyScale(itemTaxable));
            remainingDiscount = remainingDiscount.subtract(itemDiscount).max(BigDecimal.ZERO);
        }

        BigDecimal totalTaxable = order.getLineItems().stream()
                .map(lineItem -> defaultBigDecimal(lineItem.getTaxableAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal remainingTax = normalizedTax;
        for (int i = 0; i < order.getLineItems().size(); i++) {
            OrderLineItem item = order.getLineItems().get(i);
            BigDecimal itemTaxable = defaultBigDecimal(item.getTaxableAmount());
            BigDecimal itemTax;

            if (totalTaxable.compareTo(BigDecimal.ZERO) <= 0) {
                itemTax = BigDecimal.ZERO;
            } else if (i == order.getLineItems().size() - 1) {
                itemTax = remainingTax.max(BigDecimal.ZERO);
            } else {
                itemTax = normalizedTax
                        .multiply(itemTaxable)
                        .divide(totalTaxable, 2, RoundingMode.HALF_UP);
                if (itemTax.compareTo(remainingTax) > 0) {
                    itemTax = remainingTax;
                }
            }

            BigDecimal itemSubtotal = defaultBigDecimal(item.getSubtotalBeforeDiscount());
            BigDecimal itemDiscount = defaultBigDecimal(item.getDiscountAmount());
            BigDecimal itemDiscountPercent = itemSubtotal.compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ZERO
                    : itemDiscount.multiply(new BigDecimal("100"))
                            .divide(itemSubtotal, 2, RoundingMode.HALF_UP);
            BigDecimal itemFinalTotal = itemTaxable.add(itemTax);

            item.setDiscountPercent(itemDiscountPercent);
            item.setTaxAmount(toMoneyScale(itemTax));
            item.setFinalTotal(toMoneyScale(itemFinalTotal));
            remainingTax = remainingTax.subtract(itemTax).max(BigDecimal.ZERO);
        }
    }

    private BranchSettings getBranchSettingsOrDefault(Long branchId, String tenantId) {
        if (branchId == null) {
            BranchSettings fallback = new BranchSettings();
            fallback.setTaxRate(new BigDecimal("0.00"));
            fallback.setDiscountEnabled(true);
            fallback.setMaxDiscountPercent(new BigDecimal("100.00"));
            fallback.setRequireManagerApproval(false);
            return fallback;
        }

        return branchSettingsRepository.findByBranchIdAndTenantId(branchId, tenantId)
                .orElseGet(() -> {
                    BranchSettings fallback = new BranchSettings();
                    fallback.setBranchId(branchId);
                    fallback.setTaxRate(new BigDecimal("0.00"));
                    fallback.setDiscountEnabled(true);
                    fallback.setMaxDiscountPercent(new BigDecimal("100.00"));
                    fallback.setRequireManagerApproval(false);
                    return fallback;
                });
    }

    private void validateBranchDiscountRules(
            BranchSettings settings,
            BigDecimal discountPercent,
            BigDecimal subtotal,
            String discountType) {

        BigDecimal normalizedPercent = defaultBigDecimal(discountPercent);
        if (normalizedPercent.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Discount cannot be negative");
        }

        if (subtotal.compareTo(BigDecimal.ZERO) <= 0 || normalizedPercent.compareTo(BigDecimal.ZERO) == 0) {
            return;
        }

        if (!Boolean.TRUE.equals(settings.getDiscountEnabled())) {
            throw new RuntimeException("Discounts not allowed for this branch");
        }

        BigDecimal maxAllowed = defaultBigDecimal(settings.getMaxDiscountPercent());
        if (normalizedPercent.compareTo(maxAllowed) > 0) {
            throw new RuntimeException("Discount exceeds maximum allowed: "
                    + maxAllowed.stripTrailingZeros().toPlainString() + "%");
        }

        if ("FIXED".equals(discountType) && Boolean.TRUE.equals(settings.getRequireManagerApproval())) {
            log.info("Fixed discount requested and branch requires manager approval for threshold-based discounts");
        }
    }

    private String normalizeDiscountType(String rawDiscountType) {
        if (rawDiscountType == null || rawDiscountType.isBlank()) {
            return null;
        }
        String normalized = rawDiscountType.trim().toUpperCase();
        if (!"PERCENTAGE".equals(normalized) && !"FIXED".equals(normalized)) {
            throw new RuntimeException("Invalid discount type: " + rawDiscountType);
        }
        return normalized;
    }

    private BigDecimal defaultBigDecimal(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private BigDecimal toMoneyScale(BigDecimal value) {
        return defaultBigDecimal(value).setScale(2, RoundingMode.HALF_UP);
    }

    private void finalizeOrderVoid(Order order) {
        ensureLineItemsSnapshot(order);
        try {
            paymentService.refundOrderPayment(order, "Order voided");
        } catch (Exception ex) {
            log.warn("Payment reversal failed for voided order {}. Continuing void flow. reason={}",
                    order.getId(), ex.getMessage(), ex);
        }
        order.getLineItems().forEach(item -> inventoryService.addStock(item.getProduct().getId(), item.getQuantity()));
        order.setStatus(OrderStatus.CANCELLED);
        order.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(order);
    }

    private BigDecimal calculateRefundAmount(
            Order order,
            Map<Long, Integer> refundQtyByProduct,
            Map<Long, Integer> remainingQtyByProduct) {

        BigDecimal refundedSubtotal = BigDecimal.ZERO;
        for (Map.Entry<Long, Integer> entry : refundQtyByProduct.entrySet()) {
            Long productId = entry.getKey();
            int refundQty = entry.getValue();
            int purchasedQty = remainingQtyByProduct.getOrDefault(productId, 0);
            if (purchasedQty <= 0) {
                continue;
            }

            double productLineTotal = order.getLineItems().stream()
                    .filter(item -> item.getProduct() != null && Objects.equals(item.getProduct().getId(), productId))
                    .map(OrderLineItem::getLineTotal)
                    .filter(Objects::nonNull)
                    .mapToDouble(Double::doubleValue)
                    .sum();

            BigDecimal lineTotal = BigDecimal.valueOf(productLineTotal);
            BigDecimal ratio = BigDecimal.valueOf(refundQty)
                    .divide(BigDecimal.valueOf(purchasedQty), 6, RoundingMode.HALF_UP);
            refundedSubtotal = refundedSubtotal.add(lineTotal.multiply(ratio));
        }

        BigDecimal subtotal = defaultBigDecimal(order.getSubtotal());
        BigDecimal refundAmount;
        if (subtotal.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal subtotalRatio = refundedSubtotal.divide(subtotal, 6, RoundingMode.HALF_UP);
            refundAmount = defaultBigDecimal(order.getTotalAmount())
                    .multiply(subtotalRatio)
                    .setScale(2, RoundingMode.HALF_UP);
        } else {
            refundAmount = refundedSubtotal.setScale(2, RoundingMode.HALF_UP);
        }

        if (refundAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Refund amount must be greater than zero");
        }

        return refundAmount;
    }

    private void enforceVoidWithinCurrentShift(Order order, User cashier) {
        if (cashier.getRole() != Role.ROLE_CASHIER) {
            return;
        }

        var activeShift = shiftRepository.findCurrentShiftByEmployee(cashier.getId())
                .orElseThrow(() -> new RuntimeException("Void is allowed only within your active shift"));

        LocalDateTime orderTime = order.getCreatedAt();
        LocalDateTime shiftStart = activeShift.getShiftStart();
        LocalDateTime shiftEnd = activeShift.getShiftEnd() != null ? activeShift.getShiftEnd() : LocalDateTime.now();

        if (orderTime == null || orderTime.isBefore(shiftStart) || orderTime.isAfter(shiftEnd)) {
            throw new RuntimeException("Only completed orders from the current shift can be void requested");
        }
    }

    private void notifyManagersForVoidApproval(String tenantId, Order order, VoidRequest voidRequest, User cashier) {
        String orderLabel = order.getOrderNumber() != null ? order.getOrderNumber() : "#" + order.getId();
        String title = "Void Approval Required: " + orderLabel;
        String message = "Cashier " + extractCashierName(cashier) + " requested void for order " + orderLabel
                + ". Reason: " + voidRequest.getReason();
        String actionUrl = "/orders/void-requests/" + voidRequest.getId();

        List<Role> roles = List.of(Role.ROLE_BRANCH_MANAGER);
        userRepository.findByTenantIdAndRoleInAndIsDeletedFalse(tenantId, roles).stream()
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .filter(u -> {
                    if (u.getBranch() == null || order.getBranch() == null) {
                        return true;
                    }
                    return Objects.equals(u.getBranch().getId(), order.getBranch().getId());
                })
                .forEach(u -> notificationService.sendNotification(
                        u.getId(),
                        NotificationType.SYSTEM,
                        title,
                        message,
                        actionUrl));
    }

    private void notifyManagersForRefundApproval(String tenantId, Order order, com.possaas.domain.order.RefundRequest refundRequest, User cashier) {
        String orderLabel = order.getOrderNumber() != null ? order.getOrderNumber() : "#" + order.getId();
        String title = "Refund Approval Required: " + orderLabel;
        String message = "Cashier " + extractCashierName(cashier) + " requested refund for order " + orderLabel
                + ". Reason: " + refundRequest.getReason();
        String actionUrl = "/orders/refund-requests/" + refundRequest.getId();

        List<Role> roles = List.of(Role.ROLE_BRANCH_MANAGER);
        userRepository.findByTenantIdAndRoleInAndIsDeletedFalse(tenantId, roles).stream()
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .filter(u -> {
                    if (u.getBranch() == null || order.getBranch() == null) {
                        return true;
                    }
                    return Objects.equals(u.getBranch().getId(), order.getBranch().getId());
                })
                .forEach(u -> notificationService.sendNotification(
                        u.getId(),
                        NotificationType.SYSTEM,
                        title,
                        message,
                        actionUrl));
    }

    private void notifyCashierVoidDecision(Order order, VoidRequest voidRequest, boolean approved) {
        String orderLabel = order.getOrderNumber() != null ? order.getOrderNumber() : "#" + order.getId();
        String title = approved ? "Void Approved: " + orderLabel : "Void Declined: " + orderLabel;
        String message = approved
                ? "Your void request for order " + orderLabel + " was approved. Inventory has been restored."
                : "Your void request for order " + orderLabel + " was declined."
                        + (voidRequest.getReviewComment() != null && !voidRequest.getReviewComment().isBlank()
                                ? " Comment: " + voidRequest.getReviewComment()
                                : "");

        notificationService.sendNotification(
                voidRequest.getRequestedByUserId(),
                NotificationType.SYSTEM,
                title,
                message,
                "/order-history");
    }

    private void notifyCashierRefundDecision(Order order, com.possaas.domain.order.RefundRequest refundRequest, boolean approved) {
        String orderLabel = order.getOrderNumber() != null ? order.getOrderNumber() : "#" + order.getId();
        String title = approved ? "Refund Approved: " + orderLabel : "Refund Declined: " + orderLabel;
        String message = approved
                ? "Your refund request for order " + orderLabel + " was approved and processed."
                : "Your refund request for order " + orderLabel + " was declined."
                        + (refundRequest.getReviewComment() != null && !refundRequest.getReviewComment().isBlank()
                                ? " Comment: " + refundRequest.getReviewComment()
                                : "");

        notificationService.sendNotification(
                refundRequest.getRequestedByUserId(),
                NotificationType.SYSTEM,
                title,
                message,
                "/order-history");
    }

    private void validateRefundRequest(Order order, com.possaas.dto.request.RefundRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new RuntimeException("At least one refund item is required");
        }

        Map<Long, Integer> remainingQtyByProduct = order.getLineItems().stream()
                .collect(Collectors.groupingBy(
                        item -> item.getProduct().getId(),
                        Collectors.summingInt(OrderLineItem::getQuantity)));

        Map<Long, Integer> refundQtyByProduct = new java.util.HashMap<>();
        for (RefundItemRequest itemReq : request.getItems()) {
            if (itemReq.getProductId() == null || itemReq.getQuantity() == null || itemReq.getQuantity() <= 0) {
                throw new RuntimeException("Invalid refund item payload");
            }

            Integer remainingQty = remainingQtyByProduct.get(itemReq.getProductId());
            if (remainingQty == null) {
                throw new RuntimeException("Refund item does not belong to this order");
            }

            int requested = refundQtyByProduct.getOrDefault(itemReq.getProductId(), 0) + itemReq.getQuantity();
            if (requested > remainingQty) {
                throw new RuntimeException("Refund quantity exceeds remaining quantity");
            }
            refundQtyByProduct.put(itemReq.getProductId(), requested);
        }

        calculateRefundAmount(order, refundQtyByProduct, remainingQtyByProduct);
    }

    private String serializeRefundItems(List<RefundItemRequest> items) {
        try {
            return OBJECT_MAPPER.writeValueAsString(items == null ? List.of() : items);
        } catch (Exception ex) {
            throw new RuntimeException("Failed to serialize refund items", ex);
        }
    }

    private List<RefundItemRequest> deserializeRefundItems(String itemsJson) {
        try {
            return OBJECT_MAPPER.readValue(itemsJson, new TypeReference<List<RefundItemRequest>>() {});
        } catch (Exception ex) {
            throw new RuntimeException("Failed to parse refund items", ex);
        }
    }

    private com.possaas.dto.request.RefundRequest rebuildRefundRequest(Order order, com.possaas.domain.order.RefundRequest refundRequest) {
        com.possaas.dto.request.RefundRequest request = new com.possaas.dto.request.RefundRequest();
        request.setOrderId(order.getId());
        request.setReason(refundRequest.getReason());
        request.setCustomReason(refundRequest.getCustomReason());
        request.setRefundAmount(refundRequest.getRefundAmount());
        request.setItems(deserializeRefundItems(refundRequest.getItemsJson()));
        return request;
    }

    // =====================================================
    // MAPPERS
    // =====================================================

    private OrderDto mapToDto(Order order) {
        return OrderDto.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .subtotal(order.getSubtotal())
                .tax(order.getTax())
                .total(order.getTotalAmount())
                .status(order.getStatus())
                .createdAt(order.getCreatedAt())
                .cashierName(extractCashierName(order.getCashier()))
                .customerName(order.getCustomerName())
                .customerEmail(order.getCustomerEmail())
                .discountType(order.getDiscountType())
                .discountPercent(order.getDiscountPercent())
                .discountAmount(order.getDiscountAmount())
                .subtotalBeforeDiscount(order.getSubtotalBeforeDiscount())
                .taxableAmount(order.getTaxableAmount())
                .taxAmount(order.getTaxAmount())
                .finalTotal(order.getFinalTotal())
                .lineItems(resolveLineItemDtos(order))
                .originalLineItems(resolveOriginalLineItemDtos(order))
                .payments(order.getPayments() != null ? order.getPayments().stream()
                        .map(this::mapToPaymentDto)
                        .collect(Collectors.toList()) : new ArrayList<>())
                .shiftId(order.getShift() != null ? order.getShift().getId() : null)
                .shiftStatus(order.getShift() != null ? order.getShift().getStatus() : null)
                .build();
    }

    private OrderLineItemDto mapToLineItemDto(OrderLineItem item) {
        var product = item.getProduct();
        return OrderLineItemDto.builder()
                .productId(product != null ? product.getId() : null)
                .productName(product != null ? product.getName() : "Unknown Product")
                .sku(product != null ? product.getSku() : null)
                .quantity(item.getQuantity())
                .price(item.getPrice())
                .discount(item.getDiscount())
                .lineTotal(item.getLineTotal())
                .discountPercent(item.getDiscountPercent())
                .discountAmount(item.getDiscountAmount())
                .subtotalBeforeDiscount(item.getSubtotalBeforeDiscount())
                .taxableAmount(item.getTaxableAmount())
                .taxAmount(item.getTaxAmount())
                .finalTotal(item.getFinalTotal())
                .build();
    }

    private PaymentDto mapToPaymentDto(Payment p) {
        return PaymentDto.builder()
                .id(p.getId())
                .orderId(p.getOrder() != null ? p.getOrder().getId() : null)
                .method(p.getMethod())
                .amount(p.getAmount())
                .amountTendered(p.getAmountTendered())
                .changeAmount(p.getChangeAmount())
                .status(p.getStatus())
                .transactionId(p.getTransactionId())
                .createdAt(p.getCreatedAt())
                .build();
    }

    public OrderSummaryDto mapToSummaryDto(Order order) {
        String paymentMethod = "N/A";
        if (order.getPayments() != null && !order.getPayments().isEmpty()) {
            String aggregatedMethod = order.getPayments().stream()
                    .filter(Objects::nonNull)
                    .map(Payment::getMethod)
                    .filter(Objects::nonNull)
                    .map(Enum::name)
                    .distinct()
                    .collect(Collectors.joining(" + "));
            if (!aggregatedMethod.isBlank()) {
                paymentMethod = aggregatedMethod;
            }
        }

        return OrderSummaryDto.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .total(order.getTotalAmount())
                .subtotal(order.getSubtotal())
                .tax(order.getTax())
                .discount(order.getDiscount() != null ? order.getDiscount() : BigDecimal.ZERO)
                .createdAt(order.getCreatedAt())
                .status(order.getStatus())
                .cashierName(extractCashierName(order.getCashier()))
                .customerName(order.getCustomerName())
                .customerEmail(order.getCustomerEmail())
                .paymentMethod(paymentMethod)
                .payments(order.getPayments() != null ? order.getPayments().stream()
                        .filter(Objects::nonNull)
                        .map(this::mapToPaymentDto)
                        .collect(Collectors.toList()) : new ArrayList<>())
                .itemCount(resolveLineItemDtos(order).size())
                .items(resolveLineItemDtos(order))
                .shiftId(order.getShift() != null ? order.getShift().getId() : null)
                .shiftStatus(order.getShift() != null ? order.getShift().getStatus() : null)
                .build();
    }

    private OrderDetailDto mapToDetailDto(Order order) {

        OrderDetailDto dto = OrderDetailDto.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .subtotal(order.getSubtotal())
                .tax(order.getTax())
                .total(order.getTotalAmount())
                .status(order.getStatus())
                .createdAt(order.getCreatedAt())
                .cashierName(extractCashierName(order.getCashier()))
                .customerName(order.getCustomerName())
                .customerEmail(order.getCustomerEmail())
                .discountType(order.getDiscountType())
                .discountPercent(order.getDiscountPercent())
                .discountAmount(order.getDiscountAmount())
                .subtotalBeforeDiscount(order.getSubtotalBeforeDiscount())
                .taxableAmount(order.getTaxableAmount())
                .taxAmount(order.getTaxAmount())
                .finalTotal(order.getFinalTotal())
                .lineItems(resolveLineItemDtos(order))
                .originalLineItems(resolveOriginalLineItemDtos(order))
                .build();

        if (order.getPayments() != null && !order.getPayments().isEmpty()) {
            // Map all payments
            dto.setPayments(order.getPayments().stream()
                    .map(this::mapToPaymentDto)
                    .collect(Collectors.toList()));

            // For backward compatibility, set first payment details
            Payment payment = order.getPayments().get(0);
            dto.setPaymentMethod(payment.getMethod().name());
            dto.setPaymentStatus(payment.getStatus().name());
            dto.setPaidAmount(payment.getAmount().doubleValue());
            dto.setAmountTendered(payment.getAmountTendered());
            dto.setChangeAmount(payment.getChangeAmount());
        }

        return dto;
    }

    private String extractCashierName(User cashier) {
        if (cashier == null)
            return "System";
        String first = Objects.toString(cashier.getFirstName(), "");
        String last = Objects.toString(cashier.getLastName(), "");
        String full = (first + " " + last).trim();
        return full.isEmpty() ? cashier.getUsername() : full;
    }

    private List<OrderLineItemDto> resolveLineItemDtos(Order order) {
        if (order != null && order.getLineItems() != null && !order.getLineItems().isEmpty()) {
            return order.getLineItems().stream()
                    .filter(Objects::nonNull)
                    .map(this::mapToLineItemDto)
                    .collect(Collectors.toList());
        }

        if (order == null || order.getLineItemsSnapshot() == null || order.getLineItemsSnapshot().isBlank()) {
            return java.util.Collections.emptyList();
        }

        try {
            return OBJECT_MAPPER.readValue(
                    order.getLineItemsSnapshot(),
                    new TypeReference<List<OrderLineItemDto>>() {});
        } catch (Exception ex) {
            log.warn("Failed to parse line item snapshot for order {}", order.getId(), ex);
            return java.util.Collections.emptyList();
        }
    }

    private List<OrderLineItemDto> resolveOriginalLineItemDtos(Order order) {
        if (order == null || order.getLineItemsSnapshot() == null || order.getLineItemsSnapshot().isBlank()) {
            return resolveLineItemDtos(order);
        }

        try {
            return OBJECT_MAPPER.readValue(
                    order.getLineItemsSnapshot(),
                    new TypeReference<List<OrderLineItemDto>>() {});
        } catch (Exception ex) {
            log.warn("Failed to parse original line item snapshot for order {}", order.getId(), ex);
            return resolveLineItemDtos(order);
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
                                    .map(this::mapToLineItemDto)
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

    private Resource generateOrderSummaryCsv(List<OrderSummaryDto> orders) {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                PrintWriter writer = new PrintWriter(new OutputStreamWriter(outputStream, StandardCharsets.UTF_8))) {

            writer.println("Order Number,Date,Cashier,Subtotal,Tax,Total,Status,Payment Method");

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            for (OrderSummaryDto order : orders) {
                if (order == null) {
                    continue;
                }
                writer.printf("%s,%s,%s,%.2f,%.2f,%.2f,%s,%s%n",
                        order.getOrderNumber() != null ? order.getOrderNumber() : "N/A",
                        order.getCreatedAt() != null ? order.getCreatedAt().format(formatter) : "N/A",
                        order.getCashierName() != null ? order.getCashierName().replace(",", " ") : "N/A",
                        order.getSubtotal() != null ? order.getSubtotal().doubleValue() : 0.0,
                        order.getTax() != null ? order.getTax().doubleValue() : 0.0,
                        order.getTotal() != null ? order.getTotal().doubleValue() : 0.0,
                        order.getStatus() != null ? order.getStatus().name() : "N/A",
                        order.getPaymentMethod() != null ? order.getPaymentMethod() : "N/A");
            }

            writer.flush();
            return new ByteArrayResource(outputStream.toByteArray());
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate CSV export", e);
        }
    }

    private Resource generateOrderSummaryPdf(List<OrderSummaryDto> orders) {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                float y = 780;
                y = writePdfLine(content, y, PDType1Font.HELVETICA_BOLD, 16, "My Orders Report");
                y = writePdfLine(content, y, PDType1Font.HELVETICA, 10, "Generated: " + LocalDateTime.now());
                y -= 8;
                y = writePdfLine(content, y, PDType1Font.HELVETICA_BOLD, 11, "Order | Date | Total | Status | Payment");

                for (OrderSummaryDto order : orders.stream().limit(40).toList()) {
                    String line = String.format("%s | %s | %.2f | %s | %s",
                            order.getOrderNumber() == null ? "N/A" : order.getOrderNumber(),
                            order.getCreatedAt() == null ? "N/A" : order.getCreatedAt().toLocalDate().toString(),
                            order.getTotal() == null ? 0.0 : order.getTotal().doubleValue(),
                            order.getStatus() == null ? "N/A" : order.getStatus().name(),
                            order.getPaymentMethod() == null ? "N/A" : order.getPaymentMethod());
                    y = writePdfLine(content, y, PDType1Font.HELVETICA, 9, line);
                    if (y < 60) {
                        break;
                    }
                }
            }

            document.save(out);
            return new ByteArrayResource(out.toByteArray());
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF export", e);
        }
    }

    private float writePdfLine(PDPageContentStream content, float y, PDType1Font font, int size, String text)
            throws IOException {
        content.beginText();
        content.setFont(font, size);
        content.newLineAtOffset(40, y);
        content.showText(text.length() > 110 ? text.substring(0, 110) : text);
        content.endText();
        return y - (size + 4);
    }

    private void enforceActiveShiftForCashier(User user) {
        if (user == null || user.getRole() == null) {
            return;
        }

        // Only ROLE_CASHIER is strictly required to have an active shift for reconciliation.
        // Branch Managers and Store Admins can bypass this to perform administrative or quick sales.
        if (user.getRole() == Role.ROLE_STORE_ADMIN || user.getRole() == Role.ROLE_BRANCH_MANAGER) {
            log.debug("Bypassing shift check for administrative role: {} (User: {})", user.getRole(), user.getUsername());
            return;
        }

        boolean hasOpenShift = shiftRepository.findCurrentShiftByEmployee(user.getId()).isPresent();
        if (!hasOpenShift) {
            throw new RuntimeException("Open shift is required to place orders. Please open your shift first.");
        }
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
            
            // Calculate proportional reductions for BigDecimal fields
            if (lineItem.getFinalTotal() != null) {
                BigDecimal unitFinal = lineItem.getFinalTotal().divide(BigDecimal.valueOf(currentQty), 4, RoundingMode.HALF_UP);
                lineItem.setFinalTotal(unitFinal.multiply(BigDecimal.valueOf(newQty)).setScale(4, RoundingMode.HALF_UP));
            }
            if (lineItem.getTaxAmount() != null) {
                BigDecimal unitTax = lineItem.getTaxAmount().divide(BigDecimal.valueOf(currentQty), 4, RoundingMode.HALF_UP);
                lineItem.setTaxAmount(unitTax.multiply(BigDecimal.valueOf(newQty)).setScale(4, RoundingMode.HALF_UP));
            }
            if (lineItem.getTaxableAmount() != null) {
                BigDecimal unitTaxable = lineItem.getTaxableAmount().divide(BigDecimal.valueOf(currentQty), 4, RoundingMode.HALF_UP);
                lineItem.setTaxableAmount(unitTaxable.multiply(BigDecimal.valueOf(newQty)).setScale(4, RoundingMode.HALF_UP));
            }
            if (lineItem.getDiscountAmount() != null) {
                BigDecimal unitDiscount = lineItem.getDiscountAmount().divide(BigDecimal.valueOf(currentQty), 4, RoundingMode.HALF_UP);
                lineItem.setDiscountAmount(unitDiscount.multiply(BigDecimal.valueOf(newQty)).setScale(4, RoundingMode.HALF_UP));
            }
            if (lineItem.getSubtotalBeforeDiscount() != null) {
                BigDecimal unitSubtotal = lineItem.getSubtotalBeforeDiscount().divide(BigDecimal.valueOf(currentQty), 4, RoundingMode.HALF_UP);
                lineItem.setSubtotalBeforeDiscount(unitSubtotal.multiply(BigDecimal.valueOf(newQty)).setScale(4, RoundingMode.HALF_UP));
            }

            lineItem.setQuantity(newQty);
            lineItem.setLineTotal(newQty * unitLineTotal);

            refundQtyByProduct.put(productId, remainingToRefund - deductQty);
        }
    }
}
