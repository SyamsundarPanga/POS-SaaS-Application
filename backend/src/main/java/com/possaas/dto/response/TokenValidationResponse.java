package com.possaas.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TokenValidationResponse {
    private boolean valid;
    private String message;
    private UserInfo user;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private Long id;
        private String username;
        private String email;
        private String tenantId;
        private List<String> roles;
    }
    
    // Constructor for error responses
    public TokenValidationResponse(boolean valid, String message) {
        this.valid = valid;
        this.message = message;
    }
}
