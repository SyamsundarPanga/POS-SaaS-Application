package com.possaas.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class VerifyPasswordResetOtpResponse {
    private String message;
    private String email;
    private String resetToken;
}
