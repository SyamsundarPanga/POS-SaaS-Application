package com.possaas.integration;

import com.possaas.config.TenantContext;
import com.possaas.domain.notification.Notification;
import com.possaas.domain.notification.NotificationPreference;
import com.possaas.domain.notification.NotificationType;
import com.possaas.domain.tenant.SubscriptionPlan;
import com.possaas.domain.tenant.SubscriptionPlanType;
import com.possaas.domain.tenant.Tenant;
import com.possaas.domain.user.Role;
import com.possaas.domain.user.User;
import com.possaas.domain.user.UserStatus;
import com.possaas.repository.NotificationPreferenceRepository;
import com.possaas.repository.NotificationRepository;
import com.possaas.repository.SubscriptionPlanRepository;
import com.possaas.repository.TenantRepository;
import com.possaas.repository.UserRepository;
import com.possaas.service.notification.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;

class NotificationServiceIntegrationTest extends BaseIntegrationTest {

	@Autowired
	private NotificationService notificationService;

	@Autowired
	private NotificationRepository notificationRepository;

	@Autowired
	private NotificationPreferenceRepository preferenceRepository;
	
	@Autowired
	private UserRepository userRepository;
	
	@Autowired
	private TenantRepository tenantRepository;

	@Autowired
	private SubscriptionPlanRepository subscriptionPlanRepository;

	@MockBean
	private JavaMailSender mailSender;

	private static final String TENANT_ID = "test-tenant";
	private Long userId;

	@BeforeEach
	void setup() {
		TenantContext.setTenantId(TENANT_ID);
		preferenceRepository.deleteAll();
		notificationRepository.deleteAll();
		userRepository.deleteAll();
		tenantRepository.deleteAll();

		SubscriptionPlan basicPlan = subscriptionPlanRepository.findById("BASIC")
				.orElseGet(() -> {
					SubscriptionPlan plan = new SubscriptionPlan();
					plan.setId("BASIC");
					plan.setPlanType(SubscriptionPlanType.BASIC);
					plan.setMaxBranches(1);
					plan.setMaxUsers(10);
					plan.setMaxProducts(100);
					plan.setMonthlyPrice(java.math.BigDecimal.ZERO);
					return subscriptionPlanRepository.save(plan);
				});

		Tenant tenant = new Tenant();
		tenant.setId(TENANT_ID);
		tenant.setName("Notification Tenant");
		tenant.setSubscriptionPlan(basicPlan);
		tenant.setActive(true);
		tenantRepository.save(tenant);

		User user = new User();
		user.setUsername("notify-user");
		user.setEmail("notify@test.com");
		user.setPassword("encoded-password");
		user.setRole(Role.ROLE_STORE_ADMIN);
		user.setStatus(UserStatus.ACTIVE);
		user.setTenantId(TENANT_ID);
		userId = userRepository.save(user).getId();

		// Fix ambiguous mail sender issue
		doNothing().when(mailSender).send(any(SimpleMailMessage.class));
	}

	@Test
	@DisplayName("Should send notification and persist it")
	void shouldSendNotification() {

		notificationService.sendNotification(userId, NotificationType.SYSTEM, "Test Title", "Test Message", "/action");

		Page<Notification> page = notificationRepository.findAllByUserId(userId, PageRequest.of(0, 10));

		assertThat(page.getContent()).hasSize(1);

		Notification saved = page.getContent().get(0);
		assertThat(saved.getTitle()).isEqualTo("Test Title");
		assertThat(saved.isRead()).isFalse();
	}

	@Test
	@DisplayName("Should return notifications")
	void shouldGetNotifications() {

		notificationService.sendNotification(userId, NotificationType.SYSTEM, "Title1", "Message1", null);

		Page<Notification> result = notificationService.getNotifications(userId, false, PageRequest.of(0, 10));

		assertThat(result.getContent()).hasSize(1);
	}

	@Test
	@DisplayName("Should return unread count")
	void shouldReturnUnreadCount() {

		notificationService.sendNotification(userId, NotificationType.SYSTEM, "Title1", "Message1", null);

		long count = notificationService.getUnreadCount(userId);

		assertThat(count).isEqualTo(1);
	}

	@Test
	@DisplayName("Should mark notification as read")
	void shouldMarkAsRead() {

		notificationService.sendNotification(userId, NotificationType.SYSTEM, "Title1", "Message1", null);

		Notification notification = notificationRepository.findAllByUserId(userId, PageRequest.of(0, 10)).getContent()
				.get(0);

		notificationService.markAsRead(notification.getId(), userId);

		Optional<Notification> updated = notificationRepository.findByIdAndUserId(notification.getId(), userId);

		assertThat(updated).isPresent();
		assertThat(updated.get().isRead()).isTrue();
	}

	@Test
	@DisplayName("Should mark all notifications as read")
	void shouldMarkAllAsRead() {

		notificationService.sendNotification(userId, NotificationType.SYSTEM, "Title1", "Message1", null);

		notificationService.sendNotification(userId, NotificationType.SYSTEM, "Title2", "Message2", null);

		notificationService.markAllAsRead(userId);

		Page<Notification> result = notificationRepository.findAllByUserId(userId, PageRequest.of(0, 10));

		assertThat(result.getContent()).allMatch(Notification::isRead);
	}

	@Test
	@DisplayName("Should create default preferences")
	void shouldCreateDefaultPreferences() {

		NotificationPreference prefs = notificationService.getPreferences(userId);

		assertThat(prefs).isNotNull();
		assertThat(prefs.isEmailNotifications()).isTrue();
	}

	@Test
	@DisplayName("Should update preferences")
	void shouldUpdatePreferences() {

		NotificationPreference newPrefs = new NotificationPreference();
		newPrefs.setLowStockAlerts(false);
		newPrefs.setPaymentAlerts(false);
		newPrefs.setSubscriptionAlerts(false);
		newPrefs.setSystemAlerts(false);
		newPrefs.setEmailNotifications(false);

		NotificationPreference updated = notificationService.updatePreferences(userId, newPrefs);

		assertThat(updated.isLowStockAlerts()).isFalse();
		assertThat(updated.isEmailNotifications()).isFalse();
	}
}
