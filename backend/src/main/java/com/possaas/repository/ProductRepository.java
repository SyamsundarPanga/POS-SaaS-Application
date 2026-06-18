package com.possaas.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.possaas.domain.product.Product;
import com.possaas.domain.product.ProductStatus;
import com.possaas.dto.response.CategoryDistributionResponse;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
	
	long countByTenantId(String tenantId);

    boolean existsBySkuAndTenantId(String sku, String tenantId);
    boolean existsBySkuAndTenantIdAndBranch_Id(String sku, String tenantId, Long branchId);
    boolean existsBySkuEndingWithAndTenantId(String suffix, String tenantId);
    boolean existsBySkuEndingWithAndTenantIdAndBranch_Id(String suffix, String tenantId, Long branchId);

    Optional<Product> findByIdAndTenantId(Long id, String tenantId);
    Optional<Product> findByIdAndTenantIdAndBranch_Id(Long id, String tenantId, Long branchId);
    
    boolean existsByBarcodeAndTenantId(String barcode, String tenantId);
    boolean existsByBarcodeAndTenantIdAndBranch_Id(String barcode, String tenantId, Long branchId);

    Optional<Product> findBySkuAndTenantId(String sku, String tenantId);
    Optional<Product> findBySkuAndTenantIdAndBranch_Id(String sku, String tenantId, Long branchId);

    Optional<Product> findByBarcodeAndTenantId(String barcode, String tenantId);
    Optional<Product> findByBarcodeAndTenantIdAndBranch_Id(String barcode, String tenantId, Long branchId);

    Page<Product> findByStatus(ProductStatus status, Pageable pageable);
    Page<Product> findByBranch_Id(Long branchId, Pageable pageable);
    Page<Product> findByStatusAndBranch_Id(ProductStatus status, Long branchId, Pageable pageable);

    Page<Product> findByCategoryId(Long categoryId, Pageable pageable);
    Page<Product> findByCategoryIdAndBranch_Id(Long categoryId, Long branchId, Pageable pageable);

    @Query("""
        SELECT p FROM Product p
        WHERE p.tenantId = :tenantId
        AND (
            LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(p.barcode) LIKE LOWER(CONCAT('%', :query, '%'))
        )
    """)
    Page<Product> searchProducts(@Param("tenantId") String tenantId, 
                                 @Param("query") String query, 
                                 Pageable pageable);

    @Query("""
        SELECT p FROM Product p
        WHERE p.tenantId = :tenantId
        AND p.branch.id = :branchId
        AND (
            LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(p.barcode) LIKE LOWER(CONCAT('%', :query, '%'))
        )
    """)
    Page<Product> searchProductsByBranch(@Param("tenantId") String tenantId,
                                         @Param("branchId") Long branchId,
                                         @Param("query") String query,
                                         Pageable pageable);

    @Query("""
        SELECT p FROM Product p 
        WHERE p.tenantId = :tenantId 
        AND p.category.id = :categoryId 
        AND p.status = :status
    """)
    Page<Product> findByCategoryIdAndStatus(@Param("tenantId") String tenantId,
                                           @Param("categoryId") Long categoryId,
                                           @Param("status") ProductStatus status,
                                           Pageable pageable);
    @Query("""
        SELECT p FROM Product p
        WHERE p.tenantId = :tenantId
        AND p.branch.id = :branchId
        AND p.category.id = :categoryId
        AND p.status = :status
    """)
    Page<Product> findByCategoryIdAndStatusAndBranch(@Param("tenantId") String tenantId,
                                                     @Param("branchId") Long branchId,
                                                     @Param("categoryId") Long categoryId,
                                                     @Param("status") ProductStatus status,
                                                     Pageable pageable);

    @Query("SELECT COUNT(p) FROM Product p WHERE p.tenantId = :tenantId AND p.status = 'ACTIVE'")
    long countActiveProducts(@Param("tenantId") String tenantId);

    @Query("SELECT COUNT(p) FROM Product p WHERE p.category.id = :categoryId")
    long countByCategoryId(@Param("categoryId") Long categoryId);
    long countByCategoryIdAndTenantId(Long categoryId, String tenantId);
    long countByCategoryIdAndTenantIdAndBranch_Id(Long categoryId, String tenantId, Long branchId);

    List<Product> findTop10ByStatusOrderByCreatedAtDesc(ProductStatus status);
    
    
    @Query("SELECT new com.possaas.dto.response.CategoryDistributionResponse(p.category.name, COUNT(p)) " +
    	       "FROM Product p WHERE p.tenantId = :tenantId GROUP BY p.category.name")
    	List<CategoryDistributionResponse> getCategoryDistribution(@Param("tenantId") String tenantId);
}
