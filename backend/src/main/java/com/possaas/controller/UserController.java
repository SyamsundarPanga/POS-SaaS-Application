package com.possaas.controller;

import java.util.List;

import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

import com.possaas.domain.user.User;
import com.possaas.dto.request.CreateUserRequest;
import com.possaas.dto.response.UserDto;
import com.possaas.service.user.UserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User management APIs")
public class UserController {

    private final UserService userService;
    private final com.possaas.repository.OrderRepository orderRepository;
    private final com.possaas.repository.ShiftRepository shiftRepository;

    /**
     * Get all users for the current tenant with pagination.
     * Only STORE_ADMIN role can access this endpoint.
     */
    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    @Operation(summary = "List all users", description = """
            Retrieve a paginated list of users for the current tenant.
            - Accessible only by STORE_ADMIN
            - Passwords are never returned
            - Tenant isolation is enforced automatically
            """)
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Users retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT token missing or invalid"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Only STORE_ADMIN can access")
    })
    public ResponseEntity<Page<UserDto>> getAllUsers(
            @RequestParam(required = false) Long branchId,
            @ParameterObject Pageable pageable) {

        Page<User> users = userService.getAllUsers(pageable, branchId);
        Page<UserDto> userDtos = users.map(this::mapToDto);
        return ResponseEntity.ok(userDtos);
    }
    

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_STORE_ADMIN', 'ROLE_BRANCH_MANAGER')")
    @Operation(summary = "Create a new user", description = "Create a new user under the current tenant. Accessible only by STORE_ADMIN.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "User created successfully"),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<UserDto> createUser(
            @Valid @RequestBody CreateUserRequest request) {

        User user = userService.createUser(request);
        return new ResponseEntity<>(mapToDto(user), HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    @Operation(summary = "Get user by ID", description = "Retrieve a specific user by ID. Accessible only by STORE_ADMIN.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User found"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<UserDto> getUserById(@PathVariable Long id) {
        User user = userService.getUserById(id);
        return ResponseEntity.ok(mapToDto(user));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    @Operation(summary = "Update user", description = "Update an existing user. Accessible only by STORE_ADMIN.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User updated successfully"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<UserDto> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody com.possaas.dto.request.UpdateUserRequest request) {

        User user = userService.updateUser(id, request);
        return ResponseEntity.ok(mapToDto(user));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    @Operation(summary = "Delete user", description = "Soft delete a user. Accessible only by STORE_ADMIN.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "User deleted successfully"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/role")
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    @Operation(summary = "Change user role", description = "Update a user's role. Accessible only by STORE_ADMIN.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Role updated successfully"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<UserDto> changeUserRole(
            @PathVariable Long id,
            @Valid @RequestBody com.possaas.dto.request.ChangeRoleRequest request) {

        User user = userService.changeUserRole(id, request.getRole());
        return ResponseEntity.ok(mapToDto(user));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAuthority('ROLE_STORE_ADMIN')")
    @Operation(summary = "Change user status", description = "Activate or deactivate a user. Accessible only by STORE_ADMIN.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Status updated successfully"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<UserDto> changeUserStatus(
            @PathVariable Long id,
            @Valid @RequestBody com.possaas.dto.request.ChangeStatusRequest request) {

        User user = userService.changeUserStatus(id, request.getStatus());
        return ResponseEntity.ok(mapToDto(user));
    }

    @GetMapping("/me/profile")
    @Operation(summary = "Get current user profile")
    public ResponseEntity<UserDto> getMyProfile(
            @RequestHeader("Authorization") String authHeader) { // Header se token uthayenge

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new org.springframework.security.authentication.BadCredentialsException(
                    "Invalid Authorization header");
        }

        // "Bearer " suffix ko hatane ke liye
        String token = authHeader.substring(7);

        // Service call passing the JWT string
        User user = userService.getUserByJwt(token);
        return ResponseEntity.ok(mapToDto(user));
    }

    /**
     * Get employees by branch (for managers)
     */
    @GetMapping("/branch/{branchId}")
    @PreAuthorize("hasAnyAuthority('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    @Operation(summary = "Get employees by branch", description = "Get all employees (cashiers and viewers) for a specific branch")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Employees retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<List<UserDto>> getEmployeesByBranch(@PathVariable Long branchId) {
        List<User> employees = userService.getUsersByBranch(branchId);
        List<UserDto> employeeDtos = employees.stream()
                .map(this::mapToDto)
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(employeeDtos);
    }

    /**
     * Update employee (for managers)
     */
    @PutMapping("/{id}/employee")
    @PreAuthorize("hasAnyAuthority('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    @Operation(summary = "Update employee details", description = "Update employee information. Managers can only update employees in their branch.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Employee updated successfully"),
            @ApiResponse(responseCode = "404", description = "Employee not found"),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<UserDto> updateEmployee(
            @PathVariable Long id,
            @Valid @RequestBody com.possaas.dto.request.UpdateUserRequest request) {
        User user = userService.updateUser(id, request);
        return ResponseEntity.ok(mapToDto(user));
    }

    /**
     * Deactivate employee (for managers)
     */
    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyAuthority('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    @Operation(summary = "Deactivate employee", description = "Soft delete/deactivate an employee. Managers can only deactivate employees in their branch.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Employee deactivated successfully"),
            @ApiResponse(responseCode = "404", description = "Employee not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<UserDto> deactivateEmployee(@PathVariable Long id) {
        User user = userService.deactivateUser(id);
        return ResponseEntity.ok(mapToDto(user));
    }

    /**
     * Change employee status (for managers)
     */
    @PutMapping("/{id}/employee-status")
    @PreAuthorize("hasAnyAuthority('ROLE_BRANCH_MANAGER', 'ROLE_STORE_ADMIN')")
    @Operation(summary = "Change employee active/inactive status", description = "Change employee status without deleting the account.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Employee status updated successfully"),
            @ApiResponse(responseCode = "404", description = "Employee not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<UserDto> changeEmployeeStatus(
            @PathVariable Long id,
            @Valid @RequestBody com.possaas.dto.request.ChangeStatusRequest request) {
        User user = userService.changeEmployeeStatus(id, request.getStatus());
        return ResponseEntity.ok(mapToDto(user));
    }

    private UserDto mapToDto(User user) {
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setRole(user.getRole().name());
        dto.setStatus(user.getStatus().name());

        // Handle null branch gracefully
        if (user.getBranch() != null) {
            dto.setBranchId(user.getBranch().getId());
        } else {
            dto.setBranchId(null); // or set a default value
        }

        dto.setTenantId(user.getTenantId());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setUpdatedAt(user.getUpdatedAt());

        // Populate metrics
        String tenantId = com.possaas.config.TenantContext.getTenantId();
        java.time.LocalDateTime startOfDay = java.time.LocalDate.now().atStartOfDay();

        dto.setTotalSales(orderRepository.calculateTotalSalesByCashier(user.getId(), tenantId));
        dto.setTodaySales(orderRepository.calculateTodaySalesByCashier(user.getId(), tenantId, startOfDay));
        dto.setShiftCount(shiftRepository.countByEmployeeIdAndTenantId(user.getId(), tenantId));

        return dto;
    }
}
