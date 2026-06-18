package com.possaas.service.product;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
import com.possaas.domain.product.CategoryStatus;
import com.possaas.dto.request.CreateCategoryRequest;
import com.possaas.dto.request.UpdateCategoryRequest;
import com.possaas.dto.response.CategoryDto;
import com.possaas.exception.DuplicateResourceException;
import com.possaas.exception.ResourceNotFoundException;
import com.possaas.repository.CategoryRepository;
import com.possaas.repository.ProductRepository;
import com.possaas.service.audit.AuditLogService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final AuditLogService auditLogService;
  
    private final Cloudinary cloudinary;

    @Transactional
    public CategoryDto createCategory(CreateCategoryRequest request) {
        String tenantId = TenantContext.getTenantId();

        boolean duplicateName = categoryRepository.existsByNameAndTenantId(request.getName(), tenantId);
        if (duplicateName) {
            throw new DuplicateResourceException(
                "Category with name '" + request.getName() + "' already exists");
        }

        Category category = new Category();
        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setImageUrl(request.getImageUrl());
        category.setDisplayOrder(request.getDisplayOrder());
        category.setStatus(request.getStatus() != null ? request.getStatus() : CategoryStatus.ACTIVE);

        if (request.getParentId() != null) {
            Category parent = categoryRepository.findByIdAndTenantId(request.getParentId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Parent category not found with ID: " + request.getParentId()));
            category.setParent(parent);
        }

        Category saved = categoryRepository.save(category);
        auditLogService.log(
            "CATEGORY_CREATED",
            "CATEGORY",
            saved.getId().toString(),
            String.format("Created category %s", saved.getName()));
        log.info("Created category: {} for tenant: {}", saved.getName(), tenantId);
        
        return mapToDto(saved);
    }

    @Transactional
    public CategoryDto updateCategory(Long id, UpdateCategoryRequest request) {
        String tenantId = TenantContext.getTenantId();
        Category category = categoryRepository.findByIdAndTenantId(id, tenantId)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));

        if (request.getName() != null && !request.getName().equals(category.getName())) {
            boolean duplicateName = categoryRepository.existsByNameAndTenantId(request.getName(), tenantId);
            if (duplicateName) {
                throw new DuplicateResourceException(
                    "Category with name '" + request.getName() + "' already exists");
            }
            category.setName(request.getName());
        }

        if (request.getDescription() != null) {
            category.setDescription(request.getDescription());
        }
        if (request.getImageUrl() != null) {
            category.setImageUrl(request.getImageUrl());
        }
        if (request.getDisplayOrder() != null) {
            category.setDisplayOrder(request.getDisplayOrder());
        }
        if (request.getStatus() != null) {
            category.setStatus(request.getStatus());
        }
        if (request.getParentId() != null) {
            Category parent = categoryRepository.findByIdAndTenantId(request.getParentId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Parent category not found with ID: " + request.getParentId()));
            category.setParent(parent);
        }

        Category updated = categoryRepository.save(category);
        auditLogService.log(
            "CATEGORY_UPDATED",
            "CATEGORY",
            updated.getId().toString(),
            String.format("Updated category %s", updated.getName()));
        log.info("Updated category: {} for tenant: {}", updated.getName(), tenantId);
        
        return mapToDto(updated);
    }

    @Transactional(readOnly = true)
    public CategoryDto getCategoryById(Long id) {
        String tenantId = TenantContext.getTenantId();
        Category category = categoryRepository.findByIdAndTenantId(id, tenantId)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));
        
        return mapToDto(category);
    }

    @Transactional(readOnly = true)
    public Page<CategoryDto> getAllCategories(CategoryStatus status, Pageable pageable) {
        String tenantId = TenantContext.getTenantId();
        Page<Category> categories = status != null
                ? categoryRepository.findByTenantIdAndStatus(tenantId, status, pageable)
                : categoryRepository.findByTenantId(tenantId, pageable);

        return categories.map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public List<CategoryDto> getRootCategories() {
        String tenantId = TenantContext.getTenantId();
        List<Category> categories = categoryRepository.findRootCategories(tenantId);
        return categories.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CategoryDto> getSubcategories(Long parentId) {
        String tenantId = TenantContext.getTenantId();
        List<Category> subcategories = categoryRepository.findSubcategories(tenantId, parentId);
        return subcategories.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CategoryDto> getCategoryHierarchy() {
        String tenantId = TenantContext.getTenantId();
        List<Category> rootCategories = categoryRepository.findRootCategoriesWithSubcategories(tenantId);
        return rootCategories.stream()
            .map(this::mapToDtoWithSubcategories)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<CategoryDto> searchCategories(String query, Pageable pageable) {
        String tenantId = TenantContext.getTenantId();
        Page<Category> categories = categoryRepository.searchCategories(tenantId, query, pageable);
        return categories.map(this::mapToDto);
    }

    @Transactional
    public void deleteCategory(Long id) {
        String tenantId = TenantContext.getTenantId();
        Category category = categoryRepository.findByIdAndTenantId(id, tenantId)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));

        long productCount = productRepository.countByCategoryIdAndTenantId(id, tenantId);
        if (productCount > 0) {
            throw new IllegalStateException(
                "Cannot delete category with " + productCount + " products. Reassign products first.");
        }

        long subcategoryCount = categoryRepository.countByParentId(id);
        if (subcategoryCount > 0) {
            throw new IllegalStateException(
                "Cannot delete category with " + subcategoryCount + " subcategories. Delete subcategories first.");
        }

        category.setIsDeleted(true);
        categoryRepository.save(category);
        auditLogService.log(
            "CATEGORY_DELETED",
            "CATEGORY",
            category.getId().toString(),
            String.format("Deleted category %s", category.getName()));
        
        log.info("Deleted category: {} for tenant: {}", category.getName(), tenantId);
    }

    private CategoryDto mapToDto(Category category) {
        CategoryDto dto = new CategoryDto();
        dto.setId(category.getId());
        dto.setName(category.getName());
        dto.setDescription(category.getDescription());
        dto.setImageUrl(category.getImageUrl());
        dto.setDisplayOrder(category.getDisplayOrder());
        dto.setStatus(category.getStatus());
        Branch branch = category.getBranch();
        dto.setBranchId(branch != null ? branch.getId() : null);
        dto.setTenantId(category.getTenantId());
        dto.setCreatedAt(category.getCreatedAt());
        dto.setUpdatedAt(category.getUpdatedAt());

        if (category.getParent() != null) {
            dto.setParentId(category.getParent().getId());
            dto.setParentName(category.getParent().getName());
        }

        Long branchId = branch != null ? branch.getId() : null;
        int productCount = branchId != null
                ? (int) productRepository.countByCategoryIdAndTenantIdAndBranch_Id(category.getId(), category.getTenantId(), branchId)
                : (int) productRepository.countByCategoryIdAndTenantId(category.getId(), category.getTenantId());
        int subcategoryCount = branchId != null
                ? (int) categoryRepository.countByParentIdAndBranch_Id(category.getId(), branchId)
                : (int) categoryRepository.countByParentId(category.getId());

        dto.setProductCount(productCount);
        dto.setSubcategoryCount(subcategoryCount);

        return dto;
    }

    private CategoryDto mapToDtoWithSubcategories(Category category) {
        CategoryDto dto = mapToDto(category);
        
        if (category.getSubcategories() != null && !category.getSubcategories().isEmpty()) {
            List<CategoryDto> subcategoryDtos = category.getSubcategories().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
            dto.setSubcategories(subcategoryDtos);
        }

        return dto;
    }
    
    public String uploadCategoryImage(MultipartFile file) {
        try {
            String tenantId = TenantContext.getTenantId();
            
            // Upload to a 'categories' folder to keep things organized separately from products
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(),
                    ObjectUtils.asMap(
                        "folder", "categories/" + tenantId,
                        "resource_type", "auto"
                    ));
                    
            return uploadResult.get("url").toString();
        } catch (IOException e) {
            log.error("Cloudinary upload failed for category image", e);
            throw new RuntimeException("Failed to upload category image");
        }
    }
}
