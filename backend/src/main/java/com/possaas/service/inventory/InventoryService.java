package com.possaas.service.inventory;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.possaas.config.TenantContext;
import com.possaas.domain.branch.Branch;
import com.possaas.domain.inventory.Inventory;
import com.possaas.domain.inventory.StockMovement;
import com.possaas.domain.inventory.StockMovementType;
import com.possaas.domain.inventory.StockTransfer;
import com.possaas.domain.product.Product;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.dto.request.StockAdjustmentRequest;
import com.possaas.dto.request.StockTransferRequest;
import com.possaas.dto.request.UpdateThresholdRequest;
import com.possaas.dto.response.BranchDto;
import com.possaas.dto.response.InventoryDto;
import com.possaas.dto.response.InventoryReportDto;
import com.possaas.dto.response.InventoryValuationDto;
import com.possaas.dto.response.InventoryValuationResponse;
import com.possaas.dto.response.LowStockAlertDto;
import com.possaas.dto.response.StockTransferResponse;
import com.possaas.exception.InsufficientStockException;
import com.possaas.exception.ResourceNotFoundException;
import com.possaas.repository.BranchRepository;
import com.possaas.repository.InventoryRepository;
import com.possaas.repository.ProductRepository;
import com.possaas.repository.StockMovementRepository;
import com.possaas.repository.StockTransferRepository;
import com.possaas.repository.UserRepository;
import com.possaas.security.TenantContextHolder;
import com.possaas.service.notification.NotificationService;
import com.possaas.service.notification.EmailService;
import com.possaas.service.security.AccessScopeService;
import com.possaas.service.audit.AuditLogService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.thymeleaf.context.Context;
import org.springframework.data.domain.PageImpl;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryService {
        private static final int CASHIER_APPROVAL_THRESHOLD = 50;

        private final InventoryRepository inventoryRepository;
        private final ProductRepository productRepository;
        private final BranchRepository branchRepository;
        private final StockMovementRepository stockMovementRepository;
        private final StockTransferRepository stockTransferRepository;
        private final AuditLogService auditLogService;
        private final UserRepository userRepository;
        private final NotificationService notificationService;
        private final EmailService emailService;
        private final AccessScopeService accessScopeService;

        // ================= READ API =================

        /**
         * Get products with no sales in the last N days (dead stock analysis)
         */
        @Transactional(readOnly = true)
        public List<InventoryDto> getDeadStockItems(int days, Long branchId) {
                String tenantId = TenantContext.getTenantId();
                User currentUser = accessScopeService.getCurrentUser();
                java.time.LocalDateTime cutoffDate = java.time.LocalDateTime.now().minusDays(days);

                List<Inventory> deadStock;
                if (accessScopeService.isBranchScopedUser(currentUser)) {
                        Long effectiveBranchId = accessScopeService.getCurrentBranchIdRequired(currentUser);
                        deadStock = inventoryRepository.findDeadStockItemsByBranch(tenantId, cutoffDate,
                                        effectiveBranchId);
                } else if (branchId != null) {
                        accessScopeService.enforceBranchAccess(currentUser, branchId);
                        deadStock = inventoryRepository.findDeadStockItemsByBranch(tenantId, cutoffDate, branchId);
                } else {
                        deadStock = inventoryRepository.findDeadStockItems(tenantId, cutoffDate);
                }

                return deadStock.stream().map(this::mapToDto).collect(java.util.stream.Collectors.toList());
        }

        @Transactional(readOnly = true)
        public Page<InventoryDto> getAllInventory(Long branchId, Pageable pageable) {
                String tenantId = TenantContext.getTenantId();
                User currentUser = accessScopeService.getCurrentUser();

                if (accessScopeService.isBranchScopedUser(currentUser)) {
                        Long effectiveBranchId = accessScopeService.getCurrentBranchIdRequired(currentUser);
                        return inventoryRepository.findByBranchIdWithProduct(tenantId, effectiveBranchId, pageable)
                                        .map(this::mapToDto);
                }

                if (branchId != null) {
                        accessScopeService.enforceBranchAccess(currentUser, branchId);
                        return inventoryRepository.findByBranchIdWithProduct(tenantId, branchId, pageable)
                                        .map(this::mapToDto);
                }

                return inventoryRepository.findAllWithProductByTenant(tenantId, pageable)
                                .map(this::mapToDto);
        }

        @Transactional(readOnly = true)
        public Page<InventoryDto> getInventoryByBranch(Long branchId, Pageable pageable) {
                String tenantId = TenantContext.getTenantId();
                User currentUser = accessScopeService.getCurrentUser();
                accessScopeService.enforceBranchAccess(currentUser, branchId);
                return inventoryRepository.findByBranchIdWithProduct(tenantId, branchId, pageable)
                                .map(this::mapToDto);
        }

        @Transactional(readOnly = true)
        public InventoryDto getInventoryByProductAndBranch(Long productId, Long branchId) {
                String tenantId = TenantContext.getTenantId();
                User currentUser = accessScopeService.getCurrentUser();
                accessScopeService.enforceBranchAccess(currentUser, branchId);

                Inventory inventory = inventoryRepository
                                .findByProductIdAndBranchIdAndTenantId(productId, branchId, tenantId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Inventory not found for product " + productId + " at branch "
                                                                + branchId));

                return mapToDto(inventory);
        }

        @Transactional(readOnly = true)
        public List<LowStockAlertDto> getLowStockAlerts() {
                String tenantId = TenantContext.getTenantId();
                User currentUser = accessScopeService.getCurrentUser();
                List<Inventory> lowStockItems = accessScopeService.isBranchScopedUser(currentUser)
                                ? inventoryRepository.findLowStockItemsByBranch(tenantId,
                                                accessScopeService.getCurrentBranchIdRequired(currentUser))
                                : inventoryRepository.findLowStockItems(tenantId);

                return lowStockItems.stream()
                                .map(this::mapToLowStockAlert)
                                .collect(Collectors.toList());
        }

        @Transactional(readOnly = true)
        public List<LowStockAlertDto> getLowStockAlertsByBranch(Long branchId) {
                String tenantId = TenantContext.getTenantId();
                User currentUser = accessScopeService.getCurrentUser();
                accessScopeService.enforceBranchAccess(currentUser, branchId);
                List<Inventory> lowStockItems = inventoryRepository.findLowStockItemsByBranch(tenantId, branchId);

                return lowStockItems.stream()
                                .map(this::mapToLowStockAlert)
                                .collect(Collectors.toList());
        }

        @Transactional(readOnly = true)
        public List<InventoryReportDto> getInventoryReportByCategory(Long categoryId, Long branchId) {
                if (categoryId == null) {
                        throw new IllegalArgumentException("categoryId is required");
                }

                String tenantId = TenantContext.getTenantId();
                User currentUser = accessScopeService.getCurrentUser();

                Long effectiveBranchId = branchId;
                if (accessScopeService.isBranchScopedUser(currentUser)) {
                        effectiveBranchId = accessScopeService.getCurrentBranchIdRequired(currentUser);
                } else if (branchId != null) {
                        accessScopeService.enforceBranchAccess(currentUser, branchId);
                }

                List<Inventory> inventory = inventoryRepository.findByProductCategoryId(categoryId, tenantId);

                if (effectiveBranchId != null) {
                        Long finalBranchId = effectiveBranchId;
                        inventory = inventory.stream()
                                        .filter(item -> item.getBranch() != null
                                                        && finalBranchId.equals(item.getBranch().getId()))
                                        .collect(Collectors.toList());
                }

                return inventory.stream()
                                .map(item -> {
                                        InventoryReportDto dto = new InventoryReportDto();
                                        Product product = item.getProduct();

                                        dto.setProductId(product.getId());
                                        dto.setProductName(product.getName());
                                        dto.setSku(product.getSku());
                                        if (product.getCategory() != null) {
                                                dto.setCategoryId(product.getCategory().getId());
                                                dto.setCategoryName(product.getCategory().getName());
                                        } else {
                                                dto.setCategoryName("Uncategorized");
                                        }
                                        dto.setCurrentStock(item.getQuantity());
                                        dto.setCostPrice(product.getCostPrice());

                                        int qty = item.getQuantity() != null ? item.getQuantity() : 0;
                                        BigDecimal cost = product.getCostPrice() != null
                                                        ? product.getCostPrice()
                                                        : BigDecimal.ZERO;
                                        dto.setValueAtCost(cost.multiply(BigDecimal.valueOf(qty)));

                                        dto.setLowStockThreshold(item.getLowStockThreshold());
                                        dto.setIsLowStock(item.isLowStock());

                                        if (item.getBranch() != null) {
                                                dto.setBranchId(item.getBranch().getId());
                                                dto.setBranchName(item.getBranch().getName());
                                        }
                                        return dto;
                                })
                                .collect(Collectors.toList());
        }

        @Transactional(readOnly = true)
        public InventoryValuationResponse getInventoryValuation(Long branchId) {
                String tenantId = TenantContext.getTenantId();
                User currentUser = accessScopeService.getCurrentUser();

                Long effectiveBranchId = branchId;
                if (accessScopeService.isBranchScopedUser(currentUser)) {
                        effectiveBranchId = accessScopeService.getCurrentBranchIdRequired(currentUser);
                } else if (branchId != null) {
                        accessScopeService.enforceBranchAccess(currentUser, branchId);
                }

                List<InventoryValuationDto> items = inventoryRepository
                                .getInventoryValuation(tenantId, effectiveBranchId);

                BigDecimal totalValue = items.stream()
                                .map(item -> item.getValueAtCost() != null ? item.getValueAtCost() : BigDecimal.ZERO)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                int lowStockCount = (int) items.stream()
                                .filter(InventoryValuationDto::isLowStock)
                                .count();

                InventoryValuationResponse response = new InventoryValuationResponse();
                response.setItems(items);
                response.setTotalValue(totalValue);
                response.setTotalProducts(items.size());
                response.setLowStockCount(lowStockCount);
                return response;
        }

        @Transactional
        public InventoryDto updateLowStockThreshold(UpdateThresholdRequest request) {
                String tenantId = TenantContext.getTenantId();
                User currentUser = accessScopeService.getCurrentUser();

                if (request.getBranchId() == null) {
                        throw new IllegalArgumentException("branchId is required to update threshold");
                }

                accessScopeService.enforceBranchAccess(currentUser, request.getBranchId());

                if (request.getLowStockThreshold() == null || request.getLowStockThreshold() < 0) {
                        throw new IllegalArgumentException("Low stock threshold must be >= 0");
                }

                Inventory inventory = inventoryRepository
                                .findByProductIdAndBranchIdAndTenantId(
                                                request.getProductId(),
                                                request.getBranchId(),
                                                tenantId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Inventory not found for product " + request.getProductId()
                                                                + " at branch " + request.getBranchId()));

                inventory.setLowStockThreshold(request.getLowStockThreshold());
                Inventory saved = inventoryRepository.save(inventory);
                auditLogService.log(
                                "LOW_STOCK_THRESHOLD_SET",
                                "INVENTORY",
                                saved.getId().toString(),
                                String.format("Set low stock threshold to %d for product %s in branch %d",
                                                request.getLowStockThreshold(),
                                                saved.getProduct() != null ? saved.getProduct().getName() : request.getProductId(),
                                                request.getBranchId()));

                Long actorUserId = TenantContextHolder.getUserId();
                notifyLowStock(saved, currentUser, actorUserId);

                return mapToDto(saved);
        }

        // ================= STOCK ADJUSTMENT =================

        @Transactional
        public InventoryDto adjustStock(StockAdjustmentRequest request) {
                String tenantId = TenantContext.getTenantId();
                Long userId = TenantContextHolder.getUserId();
                User currentUser = accessScopeService.getCurrentUser();

                if (accessScopeService.isBranchManager(currentUser)) {
                        Long managerBranchId = accessScopeService.getCurrentBranchIdRequired(currentUser);
                        if (request.getBranchId() == null) {
                                request.setBranchId(managerBranchId);
                        } else {
                                accessScopeService.enforceBranchAccess(currentUser, request.getBranchId());
                        }
                } else if (currentUser.getRole() == Role.ROLE_CASHIER) {
                        if (request.getQuantity() > CASHIER_APPROVAL_THRESHOLD) {
                                throw new IllegalArgumentException(
                                                "Cashiers cannot adjust more than " + CASHIER_APPROVAL_THRESHOLD
                                                                + " units directly. Please request approval.");
                        }
                        if (request.getBranchId() == null) {
                                request.setBranchId(accessScopeService.getCurrentBranchIdRequired(currentUser));
                        } else {
                                accessScopeService.enforceBranchAccess(currentUser, request.getBranchId());
                        }
                }

                Product product = productRepository.findByIdAndTenantId(request.getProductId(), tenantId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Product not found with ID: " + request.getProductId()));

                Inventory inventory;

                if (request.getBranchId() == null) {
                        throw new IllegalArgumentException("branchId is required for stock adjustment");
                }
                inventory = inventoryRepository
                                .findByProductIdAndBranchIdForUpdate(
                                                request.getProductId(), request.getBranchId(), tenantId)
                                .orElseGet(() -> createInventoryForBranch(product, request.getBranchId()));

                int previousQuantity = inventory.getQuantity();
                int newQuantity;

                switch (request.getMovementType()) {
                        case RESTOCK:
                        case INITIAL_STOCK:
                        case RETURN:
                                newQuantity = previousQuantity + request.getQuantity();
                                inventory.setLastRestockDate(LocalDateTime.now());
                                break;
                        case ADJUSTMENT:
                        case WRITE_OFF:
                                newQuantity = previousQuantity - request.getQuantity();
                                break;
                        default:
                                throw new IllegalArgumentException(
                                                "Invalid movement type for adjustment: " + request.getMovementType());
                }

                if (newQuantity < 0) {
                        throw new IllegalArgumentException("Adjustment would result in negative stock");
                }

                inventory.setQuantity(newQuantity);
                Inventory saved = inventoryRepository.save(inventory);

                recordStockMovement(product, request.getBranchId(), request.getMovementType(),
                                request.getQuantity(), previousQuantity, newQuantity,
                                request.getNotes(), request.getReferenceType(),
                                request.getReferenceId(), userId);
                auditLogService.log(
                                getInventoryAuditActionForMovement(request.getMovementType()),
                                "INVENTORY",
                                saved.getId().toString(),
                                String.format("%s product %s at branch %d: %d -> %d (%d units)",
                                                request.getMovementType(),
                                                product.getName(),
                                                request.getBranchId(),
                                                previousQuantity,
                                                newQuantity,
                                                request.getQuantity()));

                log.info("Adjusted stock for product {} at branch {}: {} -> {} ({})",
                                product.getSku(), request.getBranchId(),
                                previousQuantity, newQuantity, request.getMovementType());

                return mapToDto(saved);
        }

        // ================= STOCK TRANSFER =================

        @Transactional
        public void transferStock(StockTransferRequest request) {
                String tenantId = TenantContext.getTenantId();
                Long userId = TenantContextHolder.getUserId();
                User currentUser = accessScopeService.getCurrentUser();

                if (accessScopeService.isBranchManager(currentUser)) {
                        Long managerBranchId = accessScopeService.getCurrentBranchIdRequired(currentUser);
                        if (!managerBranchId.equals(request.getFromBranchId())
                                        && !managerBranchId.equals(request.getToBranchId())) {
                                throw new IllegalArgumentException(
                                                "Branch manager can only transfer stock involving own branch");
                        }
                }

                if (request.getFromBranchId().equals(request.getToBranchId())) {
                        throw new IllegalArgumentException("Cannot transfer stock to the same branch");
                }

                Product product = productRepository.findByIdAndTenantId(request.getProductId(), tenantId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Product not found with ID: " + request.getProductId()));

                branchRepository.findByIdAndTenantId(request.getFromBranchId(), tenantId)
                                .orElseThrow(() -> new ResourceNotFoundException("Source branch not found"));

                branchRepository.findByIdAndTenantId(request.getToBranchId(), tenantId)
                                .orElseThrow(() -> new ResourceNotFoundException("Destination branch not found"));

                Inventory sourceInventory = inventoryRepository
                                .findByProductIdAndBranchIdForUpdate(
                                                request.getProductId(), request.getFromBranchId(), tenantId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Inventory not found at source branch"));

                if (sourceInventory.getAvailableQuantity() < request.getQuantity()) {
                        throw new InsufficientStockException(
                                        request.getProductId(),
                                        sourceInventory.getAvailableQuantity(),
                                        request.getQuantity());
                }

                int sourcePrevQty = sourceInventory.getQuantity();
                sourceInventory.setQuantity(sourcePrevQty - request.getQuantity());
                inventoryRepository.save(sourceInventory);

                // Ensure product exists in destination branch
                Product sourceProduct = sourceInventory.getProduct();
                Product destProduct = productRepository.findBySkuAndTenantIdAndBranch_Id(
                                sourceProduct.getSku(), tenantId, request.getToBranchId())
                                .orElseGet(() -> {
                                    log.info("Product {} not found in destination branch {}. Creating it...", 
                                            sourceProduct.getSku(), request.getToBranchId());
                                    
                                    Branch toBranch = branchRepository.findByIdAndTenantId(request.getToBranchId(), tenantId)
                                            .orElseThrow(() -> new ResourceNotFoundException("Destination branch not found"));
                                            
                                    Product newProduct = new Product();
                                    newProduct.setName(sourceProduct.getName());
                                    newProduct.setSku(sourceProduct.getSku());
                                    newProduct.setBarcode(sourceProduct.getBarcode());
                                    newProduct.setPrice(sourceProduct.getPrice());
                                    newProduct.setCostPrice(sourceProduct.getCostPrice());
                                    newProduct.setCategory(sourceProduct.getCategory());
                                    newProduct.setBranch(toBranch);
                                    newProduct.setTenantId(tenantId);
                                    newProduct.setImageUrl(sourceProduct.getImageUrl());
                                    newProduct.setDescription(sourceProduct.getDescription());
                                    newProduct.setUnit(sourceProduct.getUnit());
                                    newProduct.setMinStockLevel(sourceProduct.getMinStockLevel());
                                    newProduct.setMaxStockLevel(sourceProduct.getMaxStockLevel());
                                    newProduct.setReorderPoint(sourceProduct.getReorderPoint());
                                    newProduct.setTaxRate(sourceProduct.getTaxRate());
                                    newProduct.setIsTaxable(sourceProduct.getIsTaxable());
                                    newProduct.setStatus(sourceProduct.getStatus());
                                    newProduct.setAllowDecimalQuantity(sourceProduct.getAllowDecimalQuantity());
                                    newProduct.setTags(sourceProduct.getTags());

                                    return productRepository.saveAndFlush(newProduct);
                                });

                Inventory destInventory = inventoryRepository
                                .findByProductIdAndBranchIdForUpdate(
                                                destProduct.getId(), request.getToBranchId(), tenantId)
                                .orElseGet(() -> createInventoryForBranch(destProduct, request.getToBranchId()));

                int destPrevQty = destInventory.getQuantity();
                destInventory.setQuantity(destPrevQty + request.getQuantity());
                destInventory.setLastRestockDate(LocalDateTime.now());
                inventoryRepository.save(destInventory);

                Long transferId = System.currentTimeMillis();

                recordStockMovement(product, request.getFromBranchId(),
                                StockMovementType.TRANSFER_OUT,
                                request.getQuantity(), sourcePrevQty,
                                sourceInventory.getQuantity(),
                                request.getNotes(), "TRANSFER", transferId, userId);

                recordStockMovement(destProduct, request.getToBranchId(),
                                StockMovementType.TRANSFER_IN,
                                request.getQuantity(), destPrevQty,
                                destInventory.getQuantity(),
                                request.getNotes(), "TRANSFER", transferId, userId);

                StockTransfer transfer = new StockTransfer();
                transfer.setProduct(sourceProduct); // Link to source product for record keeping
                transfer.setSourceBranchId(request.getFromBranchId());
                transfer.setDestinationBranchId(request.getToBranchId());
                transfer.setQuantity(request.getQuantity());
                transfer.setStatus("COMPLETED");
                transfer.setNotes(request.getNotes());
                transfer.setCreatedBy(currentUser);
                StockTransfer savedTransfer = stockTransferRepository.save(transfer);

                String fromBranchName = branchRepository.findById(request.getFromBranchId()).map(Branch::getName).orElse("N/A");
                String toBranchName = branchRepository.findById(request.getToBranchId()).map(Branch::getName).orElse("N/A");

                auditLogService.log("STOCK_TRANSFER", "INVENTORY", savedTransfer.getId().toString(),
                        String.format("Transferred %d units of product: %s from branch: %s to: %s",
                                request.getQuantity(), product.getName(), fromBranchName, toBranchName));

                log.info("Transferred {} units of product {} from branch {} to branch {}",
                                request.getQuantity(), product.getSku(),
                                request.getFromBranchId(), request.getToBranchId());
        }

        // ================= DEDUCT INVENTORY (ORDER FLOW) =================

        @Transactional(propagation = Propagation.MANDATORY)
        public void deductInventory(Long productId, Integer requestedQty) {
                String tenantId = TenantContext.getTenantId();
                Long userId = TenantContextHolder.getUserId();
                User currentUser = accessScopeService.getCurrentUser();

                Inventory inventory;
                if (accessScopeService.isBranchScopedUser(currentUser)) {
                        Long branchId = accessScopeService.getCurrentBranchIdRequired(currentUser);
                        inventory = inventoryRepository
                                        .findByProductIdAndBranchIdForUpdate(productId, branchId, tenantId)
                                        .orElseThrow(() -> new RuntimeException("Inventory not found"));
                } else {
                        inventory = inventoryRepository
                                        .findByProductIdAndTenantIdForUpdate(productId, tenantId)
                                        .orElseThrow(() -> new RuntimeException("Inventory not found"));
                }

                int availableQty = inventory.getQuantity();

                if (availableQty < requestedQty) {
                        throw new InsufficientStockException(productId, availableQty, requestedQty);
                }

                inventory.setQuantity(availableQty - requestedQty);
                inventory.setLastSaleDate(LocalDateTime.now());

                notifyLowStock(inventory, currentUser, userId);
        }

        // ================= PERFORMANCE METHODS =================

        @Transactional
        public void deductStock(Long productId, Integer quantity) {
                String tenantId = TenantContext.getTenantId();
                User currentUser = accessScopeService.getCurrentUser();

                int rowsUpdated;
                if (accessScopeService.isBranchScopedUser(currentUser)) {
                        rowsUpdated = inventoryRepository
                                        .deductStockNativeByBranch(productId,
                                                        accessScopeService.getCurrentBranchIdRequired(currentUser),
                                                        tenantId, quantity);
                } else {
                        rowsUpdated = inventoryRepository
                                        .deductStockNative(productId, tenantId, quantity);
                }

                if (rowsUpdated == 0) {
                        Integer currentStock = getCurrentStock(productId);
                        if (currentStock < quantity) {
                                throw new InsufficientStockException(productId, currentStock, quantity);
                        }
                        throw new RuntimeException("Inventory not found for product: " + productId);
                }

                auditLogService.log(
                                "STOCK_REMOVED",
                                "INVENTORY",
                                productId.toString(),
                                String.format("Removed %d units from product ID %d", quantity, productId));
        }

        @Transactional
        public void addStock(Long productId, Integer quantity) {
                String tenantId = TenantContext.getTenantId();
                User currentUser = accessScopeService.getCurrentUser();

                int rowsUpdated;
                if (accessScopeService.isBranchScopedUser(currentUser)) {
                        rowsUpdated = inventoryRepository
                                        .addStockNativeByBranch(productId,
                                                        accessScopeService.getCurrentBranchIdRequired(currentUser),
                                                        tenantId, quantity);
                } else {
                        rowsUpdated = inventoryRepository
                                        .addStockNative(productId, tenantId, quantity);
                }

                if (rowsUpdated == 0) {
                        throw new RuntimeException("Inventory not found for product: " + productId);
                }

                auditLogService.log(
                                "STOCK_ADDED",
                                "INVENTORY",
                                productId.toString(),
                                String.format("Added %d units to product ID %d", quantity, productId));
        }

        @Transactional(readOnly = true)
        public Integer getCurrentStock(Long productId) {
                String tenantId = TenantContext.getTenantId();
                User currentUser = accessScopeService.getCurrentUser();

                if (accessScopeService.isBranchScopedUser(currentUser)) {
                        return inventoryRepository
                                        .findQuantityNativeByBranch(productId,
                                                        accessScopeService.getCurrentBranchIdRequired(currentUser),
                                                        tenantId)
                                        .orElseThrow(() -> new RuntimeException(
                                                        "Inventory not found for product: " + productId));
                }
                return inventoryRepository.findQuantityNative(productId, tenantId)
                                .orElseThrow(() -> new RuntimeException(
                                                "Inventory not found for product: " + productId));
        }

        // ================= TRANSFER HISTORY =================

        @Transactional(readOnly = true)
        public Page<StockTransferResponse> getTransferHistory(Long branchId, Pageable pageable) {
                String tenantId = TenantContext.getTenantId();
                User user = accessScopeService.getCurrentUser();

                Page<com.possaas.domain.inventory.StockTransfer> transfers;

                if (branchId != null) {
                        // If branchId is explicitly provided, enforce access and filter by it
                        accessScopeService.enforceBranchAccess(user, branchId);
                        transfers = stockTransferRepository.findByTenantIdAndBranch(tenantId, branchId, pageable);
                } else if (accessScopeService.isBranchScopedUser(user)) {
                        // For branch-scoped users, use their assigned branch
                        Long defaultBranchId = accessScopeService.getCurrentBranchIdRequired(user);
                        transfers = stockTransferRepository.findByTenantIdAndBranch(tenantId, defaultBranchId, pageable);
                } else {
                        // For Admins with no branch filter, show all transfers for the tenant
                        transfers = stockTransferRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable);
                }

                if (transfers.hasContent()) {
                return transfers.map(this::mapToStockTransferResponse);
                }

                return getTransferHistoryFromMovements(tenantId, user, branchId, pageable);
        }

        @Transactional(readOnly = true)
        public List<BranchDto> getTransferBranches() {
                // Forces auth/user context resolution and keeps behavior consistent with other
                // APIs.
                accessScopeService.getCurrentUser();

                return branchRepository.findAll().stream()
                                .sorted(Comparator.comparing(Branch::getName, String.CASE_INSENSITIVE_ORDER))
                                .map(this::mapToBranchDto)
                                .collect(Collectors.toList());
        }

        // ================= HELPERS =================

        private Inventory createInventoryForBranch(Product product, Long branchId) {
                String tenantId = TenantContext.getTenantId();

                Branch branch = branchRepository
                                .findByIdAndTenantId(branchId, tenantId)
                                .orElseThrow(() -> new ResourceNotFoundException("Branch not found"));

                Inventory inventory = new Inventory();
                inventory.setProduct(product);
                inventory.setBranch(branch);
                inventory.setTenantId(tenantId);
                inventory.setQuantity(0);
                inventory.setLowStockThreshold(
                                product.getMinStockLevel() != null
                                                ? product.getMinStockLevel()
                                                : 10);
                return inventoryRepository.save(inventory);
        }

        private void recordStockMovement(Product product,
                        Long branchId,
                        StockMovementType movementType,
                        Integer quantity,
                        Integer previousQty,
                        Integer newQty,
                        String notes,
                        String referenceType,
                        Long referenceId,
                        Long userId) {

                StockMovement movement = new StockMovement();
                movement.setProduct(product);
                movement.setBranchId(branchId);
                movement.setMovementType(movementType);
                movement.setQuantity(quantity);
                movement.setPreviousQuantity(previousQty);
                movement.setNewQuantity(newQty);
                movement.setNotes(notes);
                movement.setReferenceType(referenceType);
                movement.setReferenceId(referenceId);
                movement.setPerformedBy(userId);

                stockMovementRepository.save(movement);
        }

        private InventoryDto mapToDto(Inventory inventory) {
                InventoryDto dto = new InventoryDto();

                dto.setId(inventory.getId());
                dto.setTenantId(inventory.getTenantId());
                dto.setProductId(inventory.getProduct().getId());
                dto.setProductName(inventory.getProduct().getName());
                dto.setSku(inventory.getProduct().getSku());
                dto.setProductBarcode(inventory.getProduct().getBarcode());
                dto.setPrice(inventory.getProduct().getPrice());
                dto.setProductStatus(inventory.getProduct().getStatus());

                if (inventory.getProduct().getCategory() != null) {
                        dto.setCategoryName(inventory.getProduct().getCategory().getName());
                } else {
                        dto.setCategoryName("Uncategorized");
                }

                if (inventory.getBranch() != null) {
                        dto.setBranchId(inventory.getBranch().getId());
                        dto.setBranchName(inventory.getBranch().getName());
                }

                dto.setQuantity(inventory.getQuantity());
                dto.setLowStockThreshold(inventory.getLowStockThreshold());
                dto.setReservedQuantity(inventory.getReservedQuantity());
                dto.setAvailableQuantity(inventory.getAvailableQuantity());
                dto.setIsLowStock(inventory.isLowStock());
                dto.setLastRestockDate(inventory.getLastRestockDate());
                dto.setLastSaleDate(inventory.getLastSaleDate());
                dto.setIsDeleted(inventory.getIsDeleted());
                dto.setCreatedAt(inventory.getCreatedAt());
                dto.setUpdatedAt(inventory.getUpdatedAt());

                return dto;
        }

        private LowStockAlertDto mapToLowStockAlert(Inventory inventory) {
                LowStockAlertDto dto = new LowStockAlertDto();

                dto.setProductId(inventory.getProduct().getId());
                dto.setProductName(inventory.getProduct().getName());
                dto.setSku(inventory.getProduct().getSku());

                if (inventory.getBranch() != null) {
                        dto.setBranchId(inventory.getBranch().getId());
                        dto.setBranchName(inventory.getBranch().getName());
                }

                dto.setCurrentStock(inventory.getQuantity());
                dto.setThreshold(inventory.getLowStockThreshold());
                dto.setDeficit(
                                inventory.getLowStockThreshold() - inventory.getQuantity());

                if (inventory.getProduct().getCostPrice() != null) {
                        int reorderQty = inventory.getLowStockThreshold() * 2;
                        dto.setReorderCost(
                                        inventory.getProduct().getCostPrice()
                                                        .multiply(BigDecimal.valueOf(reorderQty)));
                }

                int stockPercentage = (inventory.getQuantity() * 100)
                                / inventory.getLowStockThreshold();

                if (stockPercentage <= 0)
                        dto.setSeverity("CRITICAL");
                else if (stockPercentage <= 25)
                        dto.setSeverity("HIGH");
                else if (stockPercentage <= 50)
                        dto.setSeverity("MEDIUM");
                else
                        dto.setSeverity("LOW");

                return dto;
        }

        private StockTransferResponse mapToStockTransferResponse(
                        com.possaas.domain.inventory.StockTransfer transfer) {

                String sourceBranchName = transfer.getSourceBranchId() != null
                                ? branchRepository.findById(transfer.getSourceBranchId())
                                                .map(Branch::getName)
                                                .orElse("Unknown")
                                : "Unknown";

                String destBranchName = transfer.getDestinationBranchId() != null
                                ? branchRepository.findById(transfer.getDestinationBranchId())
                                                .map(Branch::getName)
                                                .orElse("Unknown")
                                : "Unknown";

                return StockTransferResponse.builder()
                                .id(transfer.getId())
                                .productId(transfer.getProduct() != null ? transfer.getProduct().getId() : null)
                                .productName(transfer.getProduct() != null ? transfer.getProduct().getName()
                                                : "Unknown")
                                .productSku(transfer.getProduct() != null ? transfer.getProduct().getSku() : "Unknown")
                                .sourceBranchId(transfer.getSourceBranchId())
                                .sourceBranchName(sourceBranchName)
                                .destinationBranchId(transfer.getDestinationBranchId())
                                .destinationBranchName(destBranchName)
                                .quantity(transfer.getQuantity())
                                .status(transfer.getStatus())
                                .initiatedBy(transfer.getCreatedBy() != null
                                                ? transfer.getCreatedBy().getUsername()
                                                : "System")
                                .createdAt(transfer.getCreatedAt())
                                .notes(transfer.getNotes())
                                .build();
        }

        private Page<StockTransferResponse> getTransferHistoryFromMovements(
                        String tenantId,
                        User user,
                        Long requestedBranchId,
                        Pageable pageable) {
                Long effectiveBranchId = requestedBranchId;

                if (requestedBranchId != null) {
                        accessScopeService.enforceBranchAccess(user, requestedBranchId);
                } else if (accessScopeService.isBranchScopedUser(user)) {
                        effectiveBranchId = accessScopeService.getCurrentBranchIdRequired(user);
                }

                List<StockMovement> movementRows = stockMovementRepository.findTransferMovementsByTenant(tenantId);

                Map<Long, StockMovement> transferOutByReference = new HashMap<>();
                Map<Long, StockMovement> transferInByReference = new HashMap<>();

                for (StockMovement movement : movementRows) {
                        if (movement.getReferenceId() == null) {
                                continue;
                        }

                        if (movement.getMovementType() == StockMovementType.TRANSFER_OUT) {
                                transferOutByReference.putIfAbsent(movement.getReferenceId(), movement);
                        } else if (movement.getMovementType() == StockMovementType.TRANSFER_IN) {
                                transferInByReference.putIfAbsent(movement.getReferenceId(), movement);
                        }
                }

                List<StockTransferResponse> reconstructed = new ArrayList<>();
                for (Map.Entry<Long, StockMovement> entry : transferOutByReference.entrySet()) {
                        Long referenceId = entry.getKey();
                        StockMovement out = entry.getValue();
                        StockMovement in = transferInByReference.get(referenceId);
                        if (in == null) {
                                continue;
                        }

                        User actor = out.getPerformedBy() != null
                                        ? userRepository.findById(out.getPerformedBy()).orElse(null)
                                        : null;

                        StockTransferResponse response = StockTransferResponse.builder()
                                        .id(referenceId)
                                        .productId(out.getProduct() != null ? out.getProduct().getId() : null)
                                        .productName(out.getProduct() != null ? out.getProduct().getName() : "Unknown")
                                        .productSku(out.getProduct() != null ? out.getProduct().getSku() : "Unknown")
                                        .sourceBranchId(out.getBranchId())
                                        .sourceBranchName(resolveBranchName(out.getBranchId()))
                                        .destinationBranchId(in.getBranchId())
                                        .destinationBranchName(resolveBranchName(in.getBranchId()))
                                        .quantity(out.getQuantity())
                                        .status("COMPLETED")
                                        .initiatedBy(actor != null ? actor.getUsername() : "System")
                                        .createdAt(out.getCreatedAt())
                                        .notes(out.getNotes())
                                        .build();

                        if (effectiveBranchId == null
                                        || effectiveBranchId.equals(response.getSourceBranchId())
                                        || effectiveBranchId.equals(response.getDestinationBranchId())) {
                                reconstructed.add(response);
                        }
                }

                reconstructed.sort((left, right) -> right.getCreatedAt().compareTo(left.getCreatedAt()));

                int start = (int) pageable.getOffset();
                int end = Math.min(start + pageable.getPageSize(), reconstructed.size());
                List<StockTransferResponse> pageContent =
                                start >= reconstructed.size() ? List.of() : reconstructed.subList(start, end);

                return new PageImpl<>(pageContent, pageable, reconstructed.size());
        }

        private String resolveBranchName(Long branchId) {
                if (branchId == null) {
                        return "Unknown";
                }

                return branchRepository.findById(branchId)
                                .map(Branch::getName)
                                .orElse("Unknown");
        }

        private BranchDto mapToBranchDto(Branch branch) {
                BranchDto dto = new BranchDto();
                dto.setId(branch.getId());
                dto.setCode(branch.getCode());
                dto.setName(branch.getName());
                dto.setStatus(branch.getStatus());
                dto.setIsMainBranch(branch.getIsMainBranch());
                dto.setTenantId(branch.getTenantId());
                return dto;
        }

        private String getInventoryAuditActionForMovement(StockMovementType movementType) {
                return switch (movementType) {
                        case RESTOCK, INITIAL_STOCK, RETURN, TRANSFER_IN -> "STOCK_ADDED";
                        case WRITE_OFF, TRANSFER_OUT, SALE -> "STOCK_REMOVED";
                        case ADJUSTMENT -> "STOCK_UPDATED";
                };
        }

        private void notifyLowStock(Inventory inventory, User currentUser, Long actorUserId) {
                if (inventory == null || inventory.getQuantity() == null) {
                        return;
                }

                Integer threshold = inventory.getLowStockThreshold();
                if (threshold == null) {
                        threshold = 5;
                }

                if (inventory.getQuantity() > threshold) {
                        return;
                }

                final int thresholdValue = threshold;
                Long effectiveActorId = actorUserId != null ? actorUserId
                                : (currentUser != null ? currentUser.getId() : 1L);
                String productName = inventory.getProduct() != null ? inventory.getProduct().getName() : "Unknown";
                String title = "Low Stock Alert - " + productName;
                String message = "Product " + productName + " stock is low: " + inventory.getQuantity()
                                + " units remaining";

                // Notify current actor (cashier/manager/admin), preserving existing behavior.
                notificationService.sendNotification(
                                effectiveActorId,
                                com.possaas.domain.notification.NotificationType.LOW_STOCK,
                                title,
                                message,
                                "/admin/inventory");

                // Also notify all active branch managers for this branch.
                Long branchId = inventory.getBranch() != null ? inventory.getBranch().getId() : null;
                if (branchId != null) {
                        String tenantId = TenantContext.getTenantId();
                        userRepository.findByTenantIdAndBranch_Id(tenantId, branchId).stream()
                                        .filter(u -> u != null
                                                        && u.getId() != null
                                                        && !u.getId().equals(effectiveActorId)
                                                        && u.getRole() == Role.ROLE_BRANCH_MANAGER
                                                        && u.getStatus() == UserStatus.ACTIVE
                                                        && !Boolean.TRUE.equals(u.getIsDeleted()))
                                        .forEach(manager -> {
                                                notificationService.createNotification(
                                                                manager.getId(),
                                                                com.possaas.domain.notification.NotificationType.LOW_STOCK,
                                                                title,
                                                                message,
                                                                "/manager/inventory");

                                                if (manager.getEmail() == null || manager.getEmail().isBlank()) {
                                                        return;
                                                }

                                                String branchName = inventory.getBranch() != null
                                                                ? inventory.getBranch().getName()
                                                                : "Unknown Branch";

                                                try {
                                                        Context context = new Context();
                                                        context.setVariable("name", manager.getUsername());
                                                        context.setVariable("productName", productName);
                                                        context.setVariable("quantity", inventory.getQuantity());
                                                        context.setVariable("currentStock", inventory.getQuantity());
                                                        context.setVariable("threshold", thresholdValue);
                                                        context.setVariable("branchName", branchName);
                                                        context.setVariable("manageUrl", "/manager/inventory");

                                                        emailService.sendHtmlEmail(
                                                                        manager.getEmail(),
                                                                        title,
                                                                        "email/low-stock-alert",
                                                                        context);
                                                } catch (Exception e) {
                                                        log.error("Failed to send low stock email to {}", manager.getEmail(), e);
                                                }
                                        });
                }
        }

	@Transactional
	public void requestAdjustment(StockAdjustmentRequest request) {
		String tenantId = TenantContext.getTenantId();
		User currentUser = accessScopeService.getCurrentUser();
		Long branchId = accessScopeService.getCurrentBranchIdRequired(currentUser);
                if (request.getQuantity() <= CASHIER_APPROVAL_THRESHOLD) {
                        throw new IllegalArgumentException(
                                        "Direct adjustment is allowed up to " + CASHIER_APPROVAL_THRESHOLD
                                                        + " units. Use /inventory/adjust for this quantity.");
                }

		Product product = productRepository.findByIdAndTenantId(request.getProductId(), tenantId)
				.orElseThrow(() -> new ResourceNotFoundException("Product not found"));

                String notes = request.getNotes() == null ? "" : request.getNotes();

		String actionUrl = String.format("inventory-adjust:%d:%d:%d:%s:%s",
				request.getProductId(),
				branchId,
				request.getQuantity(),
				request.getMovementType(),
				notes.replace(":", ";"));

		String title = "Stock Adjustment Approval Required";
		String message = String.format("Cashier %s requested adjustment of %d units for %s. Reason: %s",
				currentUser.getUsername(),
				request.getQuantity(),
				product.getName(),
				notes);

		userRepository.findByTenantIdAndBranch_Id(tenantId, branchId).stream()
				.filter(u -> u.getRole() == Role.ROLE_BRANCH_MANAGER && u.getStatus() == UserStatus.ACTIVE)
				.forEach(manager -> {
					notificationService.createNotification(
							manager.getId(),
							com.possaas.domain.notification.NotificationType.SYSTEM,
							title,
							message,
							actionUrl);
				});
	}
}
