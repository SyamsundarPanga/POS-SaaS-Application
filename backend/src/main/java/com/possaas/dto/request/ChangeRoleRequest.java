package com.possaas.dto.request;

import com.possaas.domain.user.Role;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Schema(description = "Request object for changing user role")
public class ChangeRoleRequest {

    @Schema(description = "New role for the user", example = "ROLE_CASHIER", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "Role is required")
    private Role role;
}
