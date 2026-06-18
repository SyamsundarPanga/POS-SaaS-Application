package com.possaas.dto.response;

import com.possaas.domain.product.CategoryStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
public class CategoryDto {

    private Long id;
    private String name;
    private String description;
    private String imageUrl;
    private Integer displayOrder;
    private CategoryStatus status;
    private Long parentId;
    private String parentName;
    private Integer productCount;
    private Integer subcategoryCount;
    private Long branchId;
    private String tenantId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    private List<CategoryDto> subcategories = new ArrayList<>();
}
