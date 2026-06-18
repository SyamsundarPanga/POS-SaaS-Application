package com.possaas.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.possaas.security.JwtAuthenticationFilter;
import com.possaas.security.SubscriptionAccessFilter;
import com.possaas.service.impl.UserDetailsServiceImpl;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

	@Autowired
	UserDetailsServiceImpl userDetailsService;

	@Autowired
	private JwtAuthenticationFilter jwtAuthenticationFilter;

	@Autowired
	private TenantFilterConfig tenantFilterConfig;

	@Autowired
	private SubscriptionAccessFilter subscriptionAccessFilter;

	@Bean
	public DaoAuthenticationProvider authenticationProvider() {
		DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
		authProvider.setUserDetailsService(userDetailsService);
		authProvider.setPasswordEncoder(passwordEncoder());
		return authProvider;
	}

	@Bean
	public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
		return authConfig.getAuthenticationManager();
	}

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder(10);
	}

	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
		http.csrf(csrf -> csrf.disable()).cors(cors -> cors.configurationSource(corsConfigurationSource()))
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.authorizeHttpRequests(auth -> auth.requestMatchers("/api/auth/**").permitAll()
						.requestMatchers("/api/superadmin/login").permitAll()
						.requestMatchers("/api/test/**").permitAll()
						.requestMatchers("/swagger-ui.html", "/v3/api-docs/**", "/swagger-ui/**",
								"/swagger-resources/**")
						.permitAll()
						.requestMatchers("/api/auth/check-email-verified").permitAll()
						.requestMatchers("/api/webhooks/razorpay").permitAll()

						// SuperAdmin endpoints
						.requestMatchers("/api/superadmin/**").hasRole("SUPER_ADMIN")

						// SETTINGS first (more specific)
						.requestMatchers("/api/branches/settings/**").hasAnyRole("STORE_ADMIN", "BRANCH_MANAGER", "CASHIER")

						// Then general branches (method-level @PreAuthorize still governs create/update/delete)
						.requestMatchers("/api/branches/**")
						.hasAnyRole("STORE_ADMIN", "SUPER_ADMIN", "BRANCH_MANAGER", "VIEWER", "CASHIER")

						.requestMatchers("/api/inventory/**").hasAnyRole("STORE_ADMIN", "BRANCH_MANAGER", "CASHIER")

						.anyRequest().authenticated());

		http.authenticationProvider(authenticationProvider());

		// --- UPDATED FILTER ORDER ---
		// 1. Run JWT Filter first to authenticate the user
		http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

		// 2. Run Tenant Filter after JWT so it can see the authenticated user if needed
		http.addFilterAfter(tenantFilterConfig, JwtAuthenticationFilter.class);

		// 3. Enforce latest subscription access on every authenticated request
		http.addFilterAfter(subscriptionAccessFilter, TenantFilterConfig.class);

		return http.build();
	}

	@Bean
	public UrlBasedCorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration configuration = new CorsConfiguration();
		configuration.setAllowedOrigins(List.of("http://localhost:3000")); // Frontend URL
		configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
		configuration.setAllowedHeaders(List.of("*"));
		configuration.setAllowCredentials(true);

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", configuration);
		return source;
	}
}
