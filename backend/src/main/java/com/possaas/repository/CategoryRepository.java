package com.possaas.repository;

import com.possaas.domain.product.Category;
import com.possaas.domain.product.CategoryStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    boolean existsByNameAndTenantId(String name, String tenantId);
    boolean existsByNameAndTenantIdAndBranch_Id(String name, String tenantId, Long branchId);

    Optional<Category> findByIdAndTenantId(Long id, String tenantId);
    Optional<Category> findByIdAndTenantIdAndBranch_Id(Long id, String tenantId, Long branchId);

    Page<Category> findByTenantId(String tenantId, Pageable pageable);
    Page<Category> findByTenantIdAndStatus(String tenantId, CategoryStatus status, Pageable pageable);

    Page<Category> findByStatus(CategoryStatus status, Pageable pageable);
    Page<Category> findByBranch_Id(Long branchId, Pageable pageable);
    Page<Category> findByStatusAndBranch_Id(CategoryStatus status, Long branchId, Pageable pageable);

    @Query("SELECT c FROM Category c WHERE c.tenantId = :tenantId AND c.parent IS NULL ORDER BY c.displayOrder, c.name")
    List<Category> findRootCategories(@Param("tenantId") String tenantId);
    @Query("SELECT c FROM Category c WHERE c.parent IS NULL AND c.branch.id = :branchId ORDER BY c.displayOrder, c.name")
    List<Category> findRootCategoriesByBranch(@Param("branchId") Long branchId);

    @Query("SELECT c FROM Category c WHERE c.tenantId = :tenantId AND c.parent.id = :parentId ORDER BY c.displayOrder, c.name")
    List<Category> findSubcategories(@Param("tenantId") String tenantId, @Param("parentId") Long parentId);
    @Query("SELECT c FROM Category c WHERE c.parent.id = :parentId AND c.branch.id = :branchId ORDER BY c.displayOrder, c.name")
    List<Category> findSubcategoriesByParentAndBranch(@Param("parentId") Long parentId, @Param("branchId") Long branchId);

    @Query("SELECT c FROM Category c LEFT JOIN FETCH c.subcategories WHERE c.tenantId = :tenantId AND c.parent IS NULL ORDER BY c.displayOrder")
    List<Category> findRootCategoriesWithSubcategories(@Param("tenantId") String tenantId);
    @Query("SELECT c FROM Category c LEFT JOIN FETCH c.subcategories WHERE c.parent IS NULL AND c.branch.id = :branchId ORDER BY c.displayOrder")
    List<Category> findRootCategoriesWithSubcategoriesByBranch(@Param("branchId") Long branchId);

    @Query("""
        SELECT c FROM Category c 
        WHERE c.tenantId = :tenantId 
        AND LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%'))
        ORDER BY c.name
    """)
    Page<Category> searchCategories(@Param("tenantId") String tenantId, 
                                    @Param("query") String query, 
                                    Pageable pageable);

    @Query("""
        SELECT c FROM Category c
        WHERE c.tenantId = :tenantId
        AND c.branch.id = :branchId
        AND LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%'))
        ORDER BY c.name
    """)
    Page<Category> searchCategoriesByBranch(@Param("tenantId") String tenantId,
                                            @Param("branchId") Long branchId,
                                            @Param("query") String query,
                                            Pageable pageable);

    long countByParentId(Long parentId);
    long countByParentIdAndBranch_Id(Long parentId, Long branchId);
}
