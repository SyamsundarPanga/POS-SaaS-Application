package com.possaas.controller;

import java.util.HashMap;
import java.util.List;
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

import com.possaas.domain.product.CategoryStatus;
import com.possaas.dto.request.CreateCategoryRequest;
import com.possaas.dto.request.UpdateCategoryRequest;
import com.possaas.dto.response.CategoryDto;
import com.possaas.service.product.CategoryService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Tag(name = "Categories", description = "Product category management APIs")
public class CategoryController {

    private final CategoryService categoryService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    @Operation(summary = "Create a new category")
    public ResponseEntity<CategoryDto> createCategory(@Valid @RequestBody CreateCategoryRequest request) {
        CategoryDto response = categoryService.createCategory(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    @Operation(summary = "Update a category")
    public ResponseEntity<CategoryDto> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCategoryRequest request) {
        CategoryDto response = categoryService.updateCategory(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_CASHIER', 'ROLE_VIEWER')")
    @Operation(summary = "Get category by ID")
    public ResponseEntity<CategoryDto> getCategoryById(@PathVariable Long id) {
        CategoryDto response = categoryService.getCategoryById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_CASHIER', 'ROLE_VIEWER')")
    @Operation(summary = "Get all categories with pagination")
    public Page<CategoryDto> getAllCategories(
            @RequestParam(required = false) CategoryStatus status,
            Pageable pageable) {
        return categoryService.getAllCategories(status, pageable);
    }

    @GetMapping("/root")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_CASHIER', 'ROLE_VIEWER')")
    @Operation(summary = "Get root categories (no parent)")
    public ResponseEntity<List<CategoryDto>> getRootCategories() {
        List<CategoryDto> response = categoryService.getRootCategories();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{parentId}/subcategories")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_CASHIER', 'ROLE_VIEWER')")
    @Operation(summary = "Get subcategories of a parent category")
    public ResponseEntity<List<CategoryDto>> getSubcategories(@PathVariable Long parentId) {
        List<CategoryDto> response = categoryService.getSubcategories(parentId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/hierarchy")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_CASHIER', 'ROLE_VIEWER')")
    @Operation(summary = "Get complete category hierarchy")
    public ResponseEntity<List<CategoryDto>> getCategoryHierarchy() {
        List<CategoryDto> response = categoryService.getCategoryHierarchy();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_CASHIER', 'ROLE_VIEWER')")
    @Operation(summary = "Search categories by name")
    public Page<CategoryDto> searchCategories(
            @RequestParam("q") String query,
            Pageable pageable) {
        return categoryService.searchCategories(query, pageable);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    @Operation(summary = "Delete a category (soft delete)")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    @Operation(summary = "Upload category image to Cloudinary")
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("file") MultipartFile file) {
        // We can reuse the logic in CategoryService
        String imageUrl = categoryService.uploadCategoryImage(file);

        Map<String, String> response = new HashMap<>();
        response.put("imageUrl", imageUrl);

        return ResponseEntity.ok(response);
    }
}
