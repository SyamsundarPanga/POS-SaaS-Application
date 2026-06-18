package com.possaas.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JwtResponse {

    private String token;
    private String refreshToken;
    private String type = "Bearer";
    private Long id;
    private String username;
    private String email;
    private String tenantId;

    private String storeName;   

    private List<String> roles;
    private boolean isEmailVerified;


    // Constructor without refresh token (Backward compatibility)
    public JwtResponse(String token,
                       Long id,
                       String username,
                       String email,
                       String tenantId,
                       String storeName,
                       List<String> roles,
                       boolean isEmailVerified) {
        this.token = token;
        this.id = id;
        this.username = username;
        this.email = email;
        this.tenantId = tenantId;
        this.storeName = storeName;
        this.roles = roles;
        this.isEmailVerified = isEmailVerified;
        
    }
}
