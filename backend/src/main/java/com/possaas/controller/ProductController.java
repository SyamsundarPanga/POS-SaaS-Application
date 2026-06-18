package com.possaas.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.possaas.domain.product.ProductStatus;
import com.possaas.dto.request.CreateProductRequest;
import com.possaas.dto.request.UpdateProductRequest;
import com.possaas.dto.response.ProductDto;
import com.possaas.service.product.ProductService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Tag(name = "Products", description = "Product management APIs")
public class ProductController {

	private final ProductService productService;

	@PostMapping
	@PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
	@Operation(summary = "Create a new product", description = "Creates a product for the current tenant. Only STORE ADMIN users are allowed.")
	@ApiResponses({
			@ApiResponse(responseCode = "201", description = "Product created successfully"),
			@ApiResponse(responseCode = "400", description = "Validation error (invalid SKU, price, etc.)"),
			@ApiResponse(responseCode = "403", description = "Access denied – user does not have required role"),
			@ApiResponse(responseCode = "409", description = "Product with same SKU already exists for this tenant")
	})
	public ResponseEntity<ProductDto> createProduct(@Valid @RequestBody CreateProductRequest request) {
		ProductDto response = productService.createProduct(request);
		return ResponseEntity.status(HttpStatus.CREATED).body(response);
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
	@Operation(summary = "Update a product")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Product updated successfully"),
			@ApiResponse(responseCode = "404", description = "Product not found"),
			@ApiResponse(responseCode = "403", description = "Access denied")
	})
	public ResponseEntity<ProductDto> updateProduct(
			@PathVariable Long id,
			@Valid @RequestBody UpdateProductRequest request) {
		ProductDto response = productService.updateProduct(id, request);
		return ResponseEntity.ok(response);
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN','ROLE_CASHIER','ROLE_BRANCH_MANAGER','ROLE_VIEWER')")
	@Operation(summary = "Get product by ID")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Product retrieved successfully"),
			@ApiResponse(responseCode = "404", description = "Product not found")
	})
	public ResponseEntity<ProductDto> getProductById(@PathVariable Long id) {
		ProductDto response = productService.getProductById(id);
		return ResponseEntity.ok(response);
	}

	@GetMapping("/sku/{sku}")
	@PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN','ROLE_CASHIER','ROLE_BRANCH_MANAGER','ROLE_VIEWER')")
	@Operation(summary = "Get product by SKU")
	public ResponseEntity<ProductDto> getProductBySku(@PathVariable String sku) {
		ProductDto response = productService.getProductBySku(sku);
		return ResponseEntity.ok(response);
	}

	@GetMapping("/barcode/{barcode}")
	@PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN','ROLE_CASHIER','ROLE_BRANCH_MANAGER','ROLE_VIEWER')")
	@Operation(summary = "Get product by barcode")
	public ResponseEntity<ProductDto> getProductByBarcode(@PathVariable String barcode) {
		ProductDto response = productService.getProductByBarcode(barcode);
		return ResponseEntity.ok(response);
	}

	@GetMapping
	@PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN','ROLE_CASHIER','ROLE_BRANCH_MANAGER','ROLE_VIEWER')")
	@Operation(summary = "Get all products", description = """
			    Returns a paginated list of products for the current tenant.
			    Supports optional filtering by product status.
			    Accessible by STORE ADMIN, CASHIER, and BRANCH MANAGER roles.
			""")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Products retrieved successfully"),
			@ApiResponse(responseCode = "400", description = "Invalid request parameters"),
			@ApiResponse(responseCode = "401", description = "Unauthorized"),
			@ApiResponse(responseCode = "403", description = "Access denied")
	})
	public Page<ProductDto> getAllProducts(
			@Parameter(in = ParameterIn.QUERY, description = "Optional product status filter", example = "ACTIVE") @RequestParam(required = false) ProductStatus status,
			@Parameter(in = ParameterIn.QUERY, description = "Optional branch filter for store admins", example = "1") @RequestParam(required = false) Long branchId,
			@Parameter(in = ParameterIn.QUERY, description = "Pagination parameters (page, size, sort)", example = "page=0&size=10") Pageable pageable) {
		return productService.getAllProducts(status, branchId, pageable);
	}

	@GetMapping("/category/{categoryId}")
	@PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN','ROLE_CASHIER','ROLE_BRANCH_MANAGER','ROLE_VIEWER')")
	@Operation(summary = "Get products by category")
	public Page<ProductDto> getProductsByCategory(
			@PathVariable Long categoryId,
			@RequestParam(required = false) Long branchId,
			Pageable pageable) {
		return productService.getProductsByCategory(categoryId, branchId, pageable);
	}

	@GetMapping("/search")
	@PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN','ROLE_CASHIER','ROLE_BRANCH_MANAGER','ROLE_VIEWER')")
	@Operation(summary = "Search products by name, SKU, or barcode")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Products retrieved successfully"),
			@ApiResponse(responseCode = "400", description = "Invalid search query or pagination parameters"),
			@ApiResponse(responseCode = "401", description = "Unauthorized – missing or invalid JWT token"),
			@ApiResponse(responseCode = "403", description = "Access denied – user does not have required role")
	})
	public Page<ProductDto> searchProducts(
			@RequestParam("q") String query,
			@RequestParam(required = false) Long branchId,
			Pageable pageable) {
		return productService.searchProducts(query, branchId, pageable);
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
	@Operation(summary = "Delete a product (soft delete)")
	@ApiResponses({
			@ApiResponse(responseCode = "204", description = "Product deleted successfully"),
			@ApiResponse(responseCode = "404", description = "Product not found"),
			@ApiResponse(responseCode = "403", description = "Access denied")
	})
	public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
		productService.deleteProduct(id);
		return ResponseEntity.noContent().build();
	}

	@PostMapping(value = "/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
	@Operation(summary = "Upload product image to Cloudinary")
	public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("file") MultipartFile file) {
		String imageUrl = productService.uploadProductImage(file);

		Map<String, String> response = new HashMap<>();
		response.put("imageUrl", imageUrl);

		return ResponseEntity.ok(response);
	}
}
