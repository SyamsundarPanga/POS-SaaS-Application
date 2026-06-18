package com.possaas.dto.request;
import com.possaas.domain.user.Role;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateUserRequest {
	
	@NotBlank(message = "Username is required")
    @Size(min = 3, max = 30, message = "Username must be between 3 and 30 characters")	
    private String username;
	
	@NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")	
    private String email;
	
	 @NotBlank(message = "Password is required")
	 @Size(min = 8, message = "Password must be at least 8 characters")
	 @Pattern(
	        regexp = "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[@$!%*?&]).+$",
	        message = "Password must contain upper, lower, number, and special character"
	    )	 
    private String password;
	 
	@NotNull(message = "Role is required")
    private Role role;
	
	@NotNull(message = "branchId is required")
	private Long branchId;
	
	@NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;
}