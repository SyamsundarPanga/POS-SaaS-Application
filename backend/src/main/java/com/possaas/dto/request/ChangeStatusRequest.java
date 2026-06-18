package com.possaas.dto.request;

import com.possaas.domain.user.UserStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Schema(description = "Request object for changing user status")
public class ChangeStatusRequest {

    @Schema(description = "New status for the user", example = "ACTIVE", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "Status is required")
    private UserStatus status;
}
