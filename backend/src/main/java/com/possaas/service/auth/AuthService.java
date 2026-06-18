package com.possaas.service.auth;

import com.possaas.dto.request.LoginRequest;
import com.possaas.dto.request.RegisterTenantRequest;
import com.possaas.dto.response.JwtResponse;
import com.possaas.dto.response.LoginResponse;
import com.possaas.dto.response.RefreshTokenResponse;
import com.possaas.dto.response.VerifyPasswordResetOtpResponse;

public interface AuthService {

    JwtResponse registerTenant(RegisterTenantRequest request);

    LoginResponse login(LoginRequest request, String ipAddress);

    void logout(String refreshToken, String accessToken);

    RefreshTokenResponse refreshToken(String refreshToken);
    
    

    void requestPasswordResetLink(String email);

    void resetPassword(String email, String resetToken, String newPassword, String confirmPassword);

    void verifyEmailAccount(String token);

	VerifyPasswordResetOtpResponse verifyPasswordResetOtp(String email, String otp);

	void requestPasswordResetOtp(String email);
    
    

}
