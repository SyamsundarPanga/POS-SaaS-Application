package com.possaas.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.possaas.config.TenantContext;
import com.possaas.domain.branch.Branch;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.dto.request.CreateUserRequest;
import com.possaas.repository.OrderRepository;
import com.possaas.repository.ShiftRepository;
import com.possaas.service.user.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserService userService;
    
    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ShiftRepository shiftRepository;

    @InjectMocks
    private UserController userController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private User sampleUser;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(userController)
                .addFilters((request, response, chain) -> {
                    TenantContext.setTenantId("tenant-123");
                    try {
                        chain.doFilter(request, response);
                    } finally {
                        TenantContext.clear();
                    }
                })
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .build();

        when(orderRepository.calculateTotalSalesByCashier(any(), any())).thenReturn(java.math.BigDecimal.ZERO);
        when(orderRepository.calculateTodaySalesByCashier(any(), any(), any())).thenReturn(java.math.BigDecimal.ZERO);
        when(shiftRepository.countByEmployeeIdAndTenantId(any(), any())).thenReturn(0L);

        sampleUser = new User();
        sampleUser.setId(1L);
        sampleUser.setUsername("test_admin");
        sampleUser.setEmail("admin@pos.com");
        sampleUser.setFirstName("John");     // Added field
        sampleUser.setLastName("Doe");       // Added field
        sampleUser.setRole(Role.ROLE_STORE_ADMIN);
        sampleUser.setStatus(UserStatus.ACTIVE);
        sampleUser.setTenantId("tenant-123");
        Branch branch = new Branch();
        branch.setId(1L);
        sampleUser.setBranch(branch);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void getAllUsers_Success() throws Exception {
        PageImpl<User> page = new PageImpl<>(List.of(sampleUser));
        when(userService.getAllUsers(any(Pageable.class), any())).thenReturn(page);

        mockMvc.perform(get("/api/users")
                        .contentType(MediaType.APPLICATION_JSON))
                .andDo(print()) 
                .andExpect(status().isOk())
                // Asserting against UserDto structure now
                .andExpect(jsonPath("$.content[0].username").value("test_admin"))
                .andExpect(jsonPath("$.content[0].firstName").value("John"))
                .andExpect(jsonPath("$.content[0].lastName").value("Doe"));
    }

    @Test
    void createUser_Success() throws Exception {
        CreateUserRequest request = new CreateUserRequest();
        request.setUsername("newuser");
        request.setEmail("new@example.com");
        request.setPassword("Password123!");
        request.setFirstName("Jane");        // Added field to request
        request.setLastName("Smith");       // Added field to request
        request.setRole(Role.ROLE_CASHIER);
        request.setBranchId(1L);

        when(userService.createUser(any(CreateUserRequest.class))).thenReturn(sampleUser);

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andDo(print()) 
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("test_admin"));
    }
}
