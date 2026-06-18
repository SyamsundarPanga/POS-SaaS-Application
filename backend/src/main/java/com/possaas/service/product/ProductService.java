package com.possaas.service.product;

import com.possaas.service.audit.AuditLogService;

import java.io.IOException;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.possaas.config.TenantContext;
import com.possaas.domain.branch.Branch;
import com.possaas.domain.product.Category;
import com.possaas.domain.product.Product;
import com.possaas.domain.product.ProductStatus;
import com.possaas.domain.user.User;
import com.possaas.domain.inventory.Inventory;
import com.possaas.dto.request.CreateProductRequest;
import com.possaas.dto.request.UpdateProductRequest;
import com.possaas.dto.response.ProductDto;
import com.possaas.exception.DuplicateResourceException;
import com.possaas.exception.ResourceNotFoundException;
import com.possaas.repository.CategoryRepository;
import com.possaas.repository.BranchRepository;
import com.possaas.repository.InventoryRepository;
import com.possaas.repository.ProductRepository;
import com.possaas.service.security.AccessScopeService;
import com.possaas.service.tenant.SubscriptionService;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class ProductService {

	@Autowired
	private ProductRepository productRepository;

	@Autowired
	private CategoryRepository categoryRepository;

	@Autowired
	private BranchRepository branchRepository;

	@Autowired
	private SubscriptionService subscriptionService;
	
	@Autowired
	private Cloudinary cloudinary;

	@Autowired
	private AccessScopeService accessScopeService;

	@Autowired
	private InventoryRepository inventoryRepository;

	@Autowired
	private AuditLogService auditLogService;

	@Transactional
	public ProductDto createProduct(CreateProductRequest request) {
		String currentTenantId = TenantContext.getTenantId();
		User currentUser = accessScopeService.getCurrentUser();
		boolean isBranchManager = accessScopeService.isBranchManager(currentUser);
		Long branchId = isBranchManager ? accessScopeService.getCurrentBranchIdRequired(currentUser) : request.getBranchId();
		Branch selectedBranch = null;

		if (branchId != null) {
			selectedBranch = branchRepository.findByIdAndTenantId(branchId, currentTenantId)
					.orElseThrow(() -> new ResourceNotFoundException("Branch not found with ID: " + branchId));
		}

		// Check subscription limits
		subscriptionService.checkProductLimit(currentTenantId);

		String requestedSku = request.getSku() != null ? request.getSku().trim() : "";
		String finalSku = requestedSku.isBlank()
				? generateUniqueSku(request.getName(), currentTenantId, branchId)
				: requestedSku;

		boolean skuExists = branchId != null
				? productRepository.existsBySkuAndTenantIdAndBranch_Id(finalSku, currentTenantId, branchId)
				: productRepository.existsBySkuAndTenantId(finalSku, currentTenantId);
		if (skuExists) {
			throw new DuplicateResourceException(
					"Product with SKU " + finalSku + " already exists for this tenant");
		}
		if (request.getBarcode() != null && !request.getBarcode().isBlank()) {
			boolean barcodeExists = branchId != null
					? productRepository.existsByBarcodeAndTenantIdAndBranch_Id(request.getBarcode(), currentTenantId, branchId)
					: productRepository.existsByBarcodeAndTenantId(request.getBarcode(), currentTenantId);
	        if (barcodeExists) {
	            throw new DuplicateResourceException("Barcode " + request.getBarcode() + " already exists");
	        }
	    }

		Product product = new Product();
		product.setName(request.getName());
		product.setSku(finalSku);
		product.setPrice(request.getPrice());
		product.setCostPrice(request.getCostPrice());
		product.setImageUrl(request.getImageUrl());
		product.setDescription(request.getDescription());
		product.setStatus(request.getStatus() != null ? request.getStatus() : ProductStatus.ACTIVE);
		product.setBarcode(request.getBarcode());
		product.setUnit(request.getUnit());
		product.setMinStockLevel(request.getMinStockLevel());
		product.setMaxStockLevel(request.getMaxStockLevel());
		product.setReorderPoint(request.getReorderPoint());
		product.setTaxRate(request.getTaxRate());
		product.setIsTaxable(request.getIsTaxable());
		product.setAllowDecimalQuantity(request.getAllowDecimalQuantity());
		product.setTags(request.getTags());
		if (selectedBranch != null) {
			product.setBranch(selectedBranch);
		}

		if (request.getCategoryId() != null) {
			Category category = categoryRepository.findByIdAndTenantId(request.getCategoryId(), currentTenantId)
				.orElseThrow(() -> new ResourceNotFoundException(
					"Category not found with ID: " + request.getCategoryId()));
			product.setCategory(category);
		}

		Product savedProduct = productRepository.save(product);
		createInitialInventoryIfBranchScoped(savedProduct);

		auditLogService.log("PRODUCT_CREATED", "PRODUCT", savedProduct.getId().toString(), 
			"Created product: " + savedProduct.getName() + " (SKU: " + savedProduct.getSku() + ")");

		log.info("Created product: {} (SKU: {}) for tenant: {}", 
			savedProduct.getName(), savedProduct.getSku(), currentTenantId);
		
		return mapToDto(savedProduct);
	}

	private String generateUniqueSku(String productName, String tenantId, Long branchId) {
		String base = buildSkuPrefix(productName);
		for (int suffix = 1; suffix <= 999999; suffix++) {
			String suffixValue = String.format("-%03d", suffix);
			if (isSkuNumberAlreadyUsed(suffixValue, tenantId, branchId)) {
				continue;
			}
			String candidate = base + suffixValue;
			boolean exists = branchId != null
					? productRepository.existsBySkuAndTenantIdAndBranch_Id(candidate, tenantId, branchId)
					: productRepository.existsBySkuAndTenantId(candidate, tenantId);
			if (!exists) {
				return candidate;
			}
		}
		throw new RuntimeException("Unable to auto-generate unique SKU");
	}

	private boolean isSkuNumberAlreadyUsed(String suffixValue, String tenantId, Long branchId) {
		return branchId != null
				? productRepository.existsBySkuEndingWithAndTenantIdAndBranch_Id(suffixValue, tenantId, branchId)
				: productRepository.existsBySkuEndingWithAndTenantId(suffixValue, tenantId);
	}

	private String buildSkuPrefix(String productName) {
		String safeName = productName == null ? "" : productName.trim();
		String alphaNumeric = safeName.replaceAll("[^A-Za-z0-9]", "");
		if (alphaNumeric.isBlank()) {
			return "PRD";
		}
		String prefix = alphaNumeric.length() >= 3 ? alphaNumeric.substring(0, 3) : alphaNumeric;
		return prefix.toUpperCase(Locale.ROOT);
	}

	private void createInitialInventoryIfBranchScoped(Product product) {
		if (product.getBranch() == null || product.getBranch().getId() == null) {
			return;
		}
		String tenantId = TenantContext.getTenantId();
		Long branchId = product.getBranch().getId();
		boolean exists = inventoryRepository
				.findByProductIdAndBranchIdAndTenantId(product.getId(), branchId, tenantId)
				.isPresent();
		if (exists) {
			return;
		}

		Inventory inventory = new Inventory();
		inventory.setProduct(product);
		inventory.setBranch(product.getBranch());
		inventory.setQuantity(0);
		inventory.setReservedQuantity(0);
		inventory.setLowStockThreshold(product.getMinStockLevel() != null ? product.getMinStockLevel() : 10);
		inventoryRepository.save(inventory);
	}

	@Transactional
	public ProductDto updateProduct(Long id, UpdateProductRequest request) {
		String tenantId = TenantContext.getTenantId();
		User currentUser = accessScopeService.getCurrentUser();
		boolean isBranchManager = accessScopeService.isBranchManager(currentUser);
		Long branchId = isBranchManager ? accessScopeService.getCurrentBranchIdRequired(currentUser) : null;

		Product product = isBranchManager
			? productRepository.findByIdAndTenantIdAndBranch_Id(id, tenantId, branchId)
				.orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id))
			: productRepository.findByIdAndTenantId(id, tenantId)
			.orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));

		if (request.getName() != null) {
			product.setName(request.getName());
		}
		if (request.getPrice() != null) {
			product.setPrice(request.getPrice());
		}
		if (request.getCostPrice() != null) {
			product.setCostPrice(request.getCostPrice());
		}
		if (request.getImageUrl() != null) {
			product.setImageUrl(request.getImageUrl());
		}
		if (request.getDescription() != null) {
			product.setDescription(request.getDescription());
		}
		if (request.getStatus() != null) {
			product.setStatus(request.getStatus());
		}
		if (request.getBarcode() != null && !request.getBarcode().equals(product.getBarcode())) {
			boolean barcodeExists = isBranchManager
					? productRepository.existsByBarcodeAndTenantIdAndBranch_Id(request.getBarcode(), tenantId, branchId)
					: productRepository.existsByBarcodeAndTenantId(request.getBarcode(), tenantId);
		    if (barcodeExists) {
		        throw new DuplicateResourceException("Barcode " + request.getBarcode() + " already exists");
		    }
		    product.setBarcode(request.getBarcode());
		}
		if (request.getCategoryId() != null) {
			Category category = categoryRepository.findByIdAndTenantId(request.getCategoryId(), tenantId)
				.orElseThrow(() -> new ResourceNotFoundException(
					"Category not found with ID: " + request.getCategoryId()));
			product.setCategory(category);
		}
		if (request.getBarcode() != null) {
			product.setBarcode(request.getBarcode());
		}
		if (request.getUnit() != null) {
			product.setUnit(request.getUnit());
		}
		if (request.getMinStockLevel() != null) {
			product.setMinStockLevel(request.getMinStockLevel());
		}
		if (request.getMaxStockLevel() != null) {
			product.setMaxStockLevel(request.getMaxStockLevel());
		}
		if (request.getReorderPoint() != null) {
			product.setReorderPoint(request.getReorderPoint());
		}
		if (request.getTaxRate() != null) {
			product.setTaxRate(request.getTaxRate());
		}
		if (request.getIsTaxable() != null) {
			product.setIsTaxable(request.getIsTaxable());
		}
		if (request.getAllowDecimalQuantity() != null) {
			product.setAllowDecimalQuantity(request.getAllowDecimalQuantity());
		}
		if (request.getTags() != null) {
			product.setTags(request.getTags());
		}

		Product updated = productRepository.save(product);

		auditLogService.log("PRODUCT_UPDATED", "PRODUCT", updated.getId().toString(), 
			"Updated product: " + updated.getName());

		log.info("Updated product: {} (ID: {}) for tenant: {}", updated.getName(), id, tenantId);
		
		return mapToDto(updated);
	}

	@Transactional(readOnly = true)
	public ProductDto getProductById(Long id) {
		String tenantId = TenantContext.getTenantId();
		User currentUser = accessScopeService.getCurrentUser();
		
		Product product = accessScopeService.isBranchScopedUser(currentUser)
			? productRepository.findByIdAndTenantIdAndBranch_Id(
					id, tenantId, accessScopeService.getCurrentBranchIdRequired(currentUser))
				.orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id))
			: productRepository.findByIdAndTenantId(id, tenantId)
			.orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));
		
		return mapToDto(product);
	}

	@Transactional(readOnly = true)
	public ProductDto getProductBySku(String sku) {
		String tenantId = TenantContext.getTenantId();
		User currentUser = accessScopeService.getCurrentUser();
		
		Product product = accessScopeService.isBranchScopedUser(currentUser)
			? productRepository.findBySkuAndTenantIdAndBranch_Id(
					sku, tenantId, accessScopeService.getCurrentBranchIdRequired(currentUser))
				.orElseThrow(() -> new ResourceNotFoundException("Product not found with SKU: " + sku))
			: productRepository.findBySkuAndTenantId(sku, tenantId)
			.orElseThrow(() -> new ResourceNotFoundException("Product not found with SKU: " + sku));
		
		return mapToDto(product);
	}

	@Transactional(readOnly = true)
	public ProductDto getProductByBarcode(String barcode) {
		String tenantId = TenantContext.getTenantId();
		User currentUser = accessScopeService.getCurrentUser();
		
		Product product = accessScopeService.isBranchScopedUser(currentUser)
			? productRepository.findByBarcodeAndTenantIdAndBranch_Id(
					barcode, tenantId, accessScopeService.getCurrentBranchIdRequired(currentUser))
				.orElseThrow(() -> new ResourceNotFoundException("Product not found with barcode: " + barcode))
			: productRepository.findByBarcodeAndTenantId(barcode, tenantId)
			.orElseThrow(() -> new ResourceNotFoundException("Product not found with barcode: " + barcode));
		
		return mapToDto(product);
	}

	@Transactional(readOnly = true)
	public Page<ProductDto> getAllProducts(ProductStatus status, Long requestedBranchId, Pageable pageable) {
		String tenantId = TenantContext.getTenantId();
		User currentUser = accessScopeService.getCurrentUser();
		boolean isBranchScopedUser = accessScopeService.isBranchScopedUser(currentUser);
		Long branchId = isBranchScopedUser
				? accessScopeService.getCurrentBranchIdRequired(currentUser)
				: validateRequestedBranchId(requestedBranchId, tenantId);
		Page<Product> products;

		if (branchId != null) {
			products = status != null
					? productRepository.findByStatusAndBranch_Id(status, branchId, pageable)
					: productRepository.findByBranch_Id(branchId, pageable);
		} else {
			products = status != null
					? productRepository.findByStatus(status, pageable)
					: productRepository.findAll(pageable);
		}

		return products.map(this::mapToDto);
	}

	@Transactional(readOnly = true)
	public Page<ProductDto> getProductsByCategory(Long categoryId, Long requestedBranchId, Pageable pageable) {
		String tenantId = TenantContext.getTenantId();
		User currentUser = accessScopeService.getCurrentUser();
		Long branchId = accessScopeService.isBranchScopedUser(currentUser)
				? accessScopeService.getCurrentBranchIdRequired(currentUser)
				: validateRequestedBranchId(requestedBranchId, tenantId);
		Page<Product> products = branchId != null
				? productRepository.findByCategoryIdAndBranch_Id(categoryId, branchId, pageable)
				: productRepository.findByCategoryId(categoryId, pageable);
		return products.map(this::mapToDto);
	}

	@Transactional(readOnly = true)
	public Page<ProductDto> searchProducts(String query, Long requestedBranchId, Pageable pageable) {
		String tenantId = TenantContext.getTenantId();
		long startTime = System.currentTimeMillis();
		User currentUser = accessScopeService.getCurrentUser();
		Long branchId = accessScopeService.isBranchScopedUser(currentUser)
				? accessScopeService.getCurrentBranchIdRequired(currentUser)
				: validateRequestedBranchId(requestedBranchId, tenantId);

		Page<Product> products = branchId != null
				? productRepository.searchProductsByBranch(tenantId, branchId, query, pageable)
				: productRepository.searchProducts(tenantId, query, pageable);
		
		long duration = System.currentTimeMillis() - startTime;
        if (duration > 500) {
            log.warn("Slow query detected: Product search took {}ms for query '{}' [Tenant: {}]", 
                     duration, query, tenantId);
        }

		return products.map(this::mapToDto);
	}

	private Long validateRequestedBranchId(Long requestedBranchId, String tenantId) {
		if (requestedBranchId == null) {
			return null;
		}

		return branchRepository.findByIdAndTenantId(requestedBranchId, tenantId)
				.map(Branch::getId)
				.orElseThrow(() -> new ResourceNotFoundException("Branch not found with ID: " + requestedBranchId));
	}

	@Transactional
	public void deleteProduct(Long id) {
		String tenantId = TenantContext.getTenantId();
		User currentUser = accessScopeService.getCurrentUser();

		Product product = accessScopeService.isBranchManager(currentUser)
			? productRepository.findByIdAndTenantIdAndBranch_Id(
					id, tenantId, accessScopeService.getCurrentBranchIdRequired(currentUser))
				.orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id))
			: productRepository.findByIdAndTenantId(id, tenantId)
			.orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));

		product.setIsDeleted(true);
		product.setStatus(ProductStatus.INACTIVE);
		productRepository.save(product);
		
		auditLogService.log("PRODUCT_DELETED", "PRODUCT", product.getId().toString(), 
			"Deleted product: " + product.getName());

		log.info("Deleted product: {} (ID: {}) for tenant: {}", product.getName(), id, tenantId);
	}

	private ProductDto mapToDto(Product product) {
		ProductDto dto = new ProductDto();
		dto.setId(product.getId());
		dto.setName(product.getName());
		dto.setSku(product.getSku());
		dto.setPrice(product.getPrice());
		dto.setCostPrice(product.getCostPrice());
		dto.setImageUrl(product.getImageUrl());
		dto.setDescription(product.getDescription());
		dto.setStatus(product.getStatus());
		dto.setBarcode(product.getBarcode());
		dto.setUnit(product.getUnit());
		dto.setMinStockLevel(product.getMinStockLevel());
		dto.setMaxStockLevel(product.getMaxStockLevel());
		dto.setReorderPoint(product.getReorderPoint());
		dto.setTaxRate(product.getTaxRate());
		dto.setIsTaxable(product.getIsTaxable());
		dto.setAllowDecimalQuantity(product.getAllowDecimalQuantity());
		dto.setTags(product.getTags());
		dto.setBranchId(product.getBranch() != null ? product.getBranch().getId() : null);
		dto.setTenantId(product.getTenantId());
		dto.setCreatedAt(product.getCreatedAt());
		dto.setUpdatedAt(product.getUpdatedAt());

		if (product.getCategory() != null) {
			dto.setCategoryId(product.getCategory().getId());
			dto.setCategoryName(product.getCategory().getName());
		}

		Long branchId = product.getBranch() != null ? product.getBranch().getId() : null;
		Inventory inventory = branchId != null
				? inventoryRepository.findByProductIdAndBranchIdAndTenantId(product.getId(), branchId, product.getTenantId())
						.orElse(null)
				: inventoryRepository.findByProductIdAndTenantId(product.getId(), product.getTenantId()).orElse(null);

		int currentStock = inventory != null && inventory.getQuantity() != null ? inventory.getQuantity() : 0;
		dto.setCurrentStock(currentStock);
		dto.setIsLowStock(
				inventory != null
						? inventory.isLowStock()
						: currentStock <= (product.getMinStockLevel() != null ? product.getMinStockLevel() : 10));

		return dto;
	}
	
	public String uploadProductImage(MultipartFile file) {
	    try {
	        String tenantId = TenantContext.getTenantId();
	        Map uploadResult = cloudinary.uploader().upload(file.getBytes(),
	                ObjectUtils.asMap(
	                    "folder", "products/" + tenantId,
	                    "resource_type", "auto"
	                ));
	        return uploadResult.get("url").toString();
	    } catch (IOException e) {
	        log.error("Cloudinary upload failed", e);
	        throw new RuntimeException("Failed to upload image");
	    }
	}
}
