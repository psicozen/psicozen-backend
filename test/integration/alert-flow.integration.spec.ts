import { Repository } from 'typeorm';
import { AlertService } from '../../src/modules/emociograma/application/services/alert.service';
import { EmociogramaAlertRepository } from '../../src/modules/emociograma/infrastructure/repositories/alert.repository';
import { UserRepository } from '../../src/modules/users/infrastructure/repositories/user.repository';
import { RoleRepository } from '../../src/modules/roles/infrastructure/repositories/role.repository';
import { EmociogramaAlertSchema } from '../../src/modules/emociograma/infrastructure/persistence/alert.schema';
import { EmociogramaSubmissionSchema } from '../../src/modules/emociograma/infrastructure/persistence/submission.schema';
import { UserSchema } from '../../src/modules/users/infrastructure/persistence/user.schema';
import { UserRoleSchema } from '../../src/modules/roles/infrastructure/persistence/user-role.schema';
import { RoleSchema } from '../../src/modules/roles/infrastructure/persistence/role.schema';
import { OrganizationSchema } from '../../src/modules/organizations/infrastructure/persistence/organization.schema';
import { EmociogramaSubmissionEntity } from '../../src/modules/emociograma/domain/entities/submission.entity';
import { EmailService } from '../../src/modules/emails/infrastructure/services/email.service';
import { USER_REPOSITORY } from '../../src/modules/users/domain/repositories/user.repository.interface';
import { EMOCIOGRAMA_ALERT_REPOSITORY } from '../../src/modules/emociograma/domain/repositories/alert.repository.interface';
import { Role } from '../../src/modules/roles/domain/enums/role.enum';
import {
  initializeTestDatabase,
  clearDatabase,
  closeDatabase,
  getTestDataSource,
  ensureSeedRolesExist,
  runAsServiceRole,
} from '../utils/test-database.helper';
import { resetAllFixtures } from '../utils/reset-fixtures.helper';
import { createUserFixture } from '../fixtures/user.fixtures';
import { createCompanyFixture } from '../fixtures/organization.fixtures';

/**
 * Alert Flow Integration Tests
 *
 * Tests the complete alert lifecycle:
 * 1. Create organization with managers (GESTOR/ADMIN roles)
 * 2. Create a submission that triggers an alert
 * 3. Verify alert is created in database
 * 4. Verify emails are sent to correct users
 * 5. Verify notification details are recorded
 * 6. Resolve alert and verify update
 */
describe('Alert Flow Integration Tests', () => {
  let alertService: AlertService;
  let alertRepository: EmociogramaAlertRepository;
  let userRepository: UserRepository;
  let roleRepository: RoleRepository;
  let mockEmailService: jest.Mocked<EmailService>;

  // TypeORM repositories for direct database access
  let typeormAlertRepository: Repository<EmociogramaAlertSchema>;
  let typeormSubmissionRepository: Repository<EmociogramaSubmissionSchema>;
  let typeormUserRepository: Repository<UserSchema>;
  let typeormUserRoleRepository: Repository<UserRoleSchema>;
  let typeormRoleRepository: Repository<RoleSchema>;
  let typeormOrgRepository: Repository<OrganizationSchema>;

  // Shared roles from seed data
  let savedRoles: {
    admin: RoleSchema;
    gestor: RoleSchema;
    colaborador: RoleSchema;
  };

  beforeAll(async () => {
    await initializeTestDatabase();
    await ensureSeedRolesExist();

    const dataSource = getTestDataSource();

    // Get TypeORM repositories
    typeormAlertRepository = dataSource.getRepository(EmociogramaAlertSchema);
    typeormSubmissionRepository = dataSource.getRepository(
      EmociogramaSubmissionSchema,
    );
    typeormUserRepository = dataSource.getRepository(UserSchema);
    typeormUserRoleRepository = dataSource.getRepository(UserRoleSchema);
    typeormRoleRepository = dataSource.getRepository(RoleSchema);
    typeormOrgRepository = dataSource.getRepository(OrganizationSchema);

    // Initialize application repositories
    alertRepository = new EmociogramaAlertRepository(typeormAlertRepository);
    userRepository = new UserRepository(typeormUserRepository);
    roleRepository = new RoleRepository(
      typeormRoleRepository,
      typeormUserRoleRepository,
    );

    // Fetch existing seed roles
    const adminRole = await typeormRoleRepository.findOne({
      where: { name: Role.ADMIN },
    });
    const gestorRole = await typeormRoleRepository.findOne({
      where: { name: Role.GESTOR },
    });
    const colaboradorRole = await typeormRoleRepository.findOne({
      where: { name: Role.COLABORADOR },
    });

    savedRoles = {
      admin: adminRole,
      gestor: gestorRole,
      colaborador: colaboradorRole,
    };

    console.log('✅ Using seed roles for alert tests:', {
      admin: savedRoles.admin.id,
      gestor: savedRoles.gestor.id,
      colaborador: savedRoles.colaborador.id,
    });
  });

  beforeEach(async () => {
    // Reset fixture counters
    resetAllFixtures();

    // Create mock email service
    mockEmailService = {
      send: jest.fn().mockResolvedValue({ id: 'email-123' }),
      sendMagicLink: jest.fn(),
      sendWelcome: jest.fn(),
    } as unknown as jest.Mocked<EmailService>;

    // Create AlertService with real repositories and mocked email
    alertService = new AlertService(
      userRepository,
      alertRepository,
      mockEmailService,
    );
  });

  afterEach(async () => {
    resetAllFixtures();
    // Clear test data but preserve seed data
    await runAsServiceRole(async () => {
      // Clear alerts first (child table)
      await typeormAlertRepository.delete({});
      // Clear submissions
      await typeormSubmissionRepository.delete({});
    });
    await clearDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Complete Alert Flow', () => {
    it('should create alert, send notifications, and allow resolution', async () => {
      // ========================================
      // ARRANGE: Create organization, users, and submission
      // ========================================
      const { savedOrg, savedGestor, savedAdmin, savedSubmission } =
        await runAsServiceRole(async () => {
          // 1. Create organization
          const orgFixture = createCompanyFixture({ name: 'Alert Test Org' });
          const savedOrg = await typeormOrgRepository.save(orgFixture);

          // 2. Create manager users (GESTOR and ADMIN)
          const gestorFixture = createUserFixture({
            email: 'gestor@alerttest.com',
            firstName: 'Gestor',
            lastName: 'Test',
            supabaseUserId: '10000001-0000-0000-0000-000000000001',
          });
          const savedGestor = await typeormUserRepository.save(gestorFixture);

          const adminFixture = createUserFixture({
            email: 'admin@alerttest.com',
            firstName: 'Admin',
            lastName: 'Test',
            supabaseUserId: '10000001-0000-0000-0000-000000000002',
          });
          const savedAdmin = await typeormUserRepository.save(adminFixture);

          // 3. Create a colaborador who submits the emociograma
          const colaboradorFixture = createUserFixture({
            email: 'colaborador@alerttest.com',
            firstName: 'Colaborador',
            lastName: 'Test',
            supabaseUserId: '10000001-0000-0000-0000-000000000003',
          });
          const savedColaborador =
            await typeormUserRepository.save(colaboradorFixture);

          // 4. Assign roles to users
          await roleRepository.assignRoleToUser({
            userId: savedGestor.id,
            roleId: savedRoles.gestor.id,
            organizationId: savedOrg.id,
            assignedBy: savedAdmin.id,
          });

          await roleRepository.assignRoleToUser({
            userId: savedAdmin.id,
            roleId: savedRoles.admin.id,
            organizationId: savedOrg.id,
            assignedBy: savedAdmin.id,
          });

          await roleRepository.assignRoleToUser({
            userId: savedColaborador.id,
            roleId: savedRoles.colaborador.id,
            organizationId: savedOrg.id,
            assignedBy: savedAdmin.id,
          });

          // 5. Create a submission with critical emotion level (9 = Anxious)
          const submissionSchema = new EmociogramaSubmissionSchema();
          submissionSchema.organizationId = savedOrg.id;
          submissionSchema.userId = savedColaborador.id;
          submissionSchema.emotionLevel = 9;
          submissionSchema.emotionEmoji = '😟';
          submissionSchema.categoryId = '00000000-0000-0000-0000-000000000001';
          submissionSchema.isAnonymous = false;
          submissionSchema.comment = 'Estou muito ansioso com os prazos';
          submissionSchema.commentFlagged = false;
          submissionSchema.submittedAt = new Date();
          submissionSchema.department = 'Engenharia';
          submissionSchema.team = 'Backend';

          const savedSubmission =
            await typeormSubmissionRepository.save(submissionSchema);

          return { savedOrg, savedGestor, savedAdmin, savedSubmission };
        });

      // Convert schema to domain entity for AlertService
      const submissionEntity = new EmociogramaSubmissionEntity({
        id: savedSubmission.id,
        organizationId: savedSubmission.organizationId,
        userId: savedSubmission.userId,
        emotionLevel: savedSubmission.emotionLevel,
        emotionEmoji: savedSubmission.emotionEmoji,
        categoryId: savedSubmission.categoryId,
        isAnonymous: savedSubmission.isAnonymous,
        comment: savedSubmission.comment,
        commentFlagged: savedSubmission.commentFlagged,
        submittedAt: savedSubmission.submittedAt,
        department: savedSubmission.department,
        team: savedSubmission.team,
        createdAt: savedSubmission.createdAt,
        updatedAt: savedSubmission.updatedAt,
      });

      // ========================================
      // ACT: Trigger alert
      // ========================================
      const alert = await alertService.triggerEmotionalAlert(submissionEntity);

      // ========================================
      // ASSERT: Verify alert creation
      // ========================================
      expect(alert).toBeDefined();
      expect(alert).not.toBeNull();
      expect(alert.id).toBeDefined();
      expect(alert.organizationId).toBe(savedOrg.id);
      expect(alert.submissionId).toBe(savedSubmission.id);
      expect(alert.alertType).toBe('threshold_exceeded');
      expect(alert.severity).toBe('critical'); // Level 9 = critical
      expect(alert.isResolved).toBe(false);

      // ========================================
      // ASSERT: Verify alert persisted in database
      // ========================================
      const dbAlert = await typeormAlertRepository.findOne({
        where: { id: alert.id },
      });
      expect(dbAlert).toBeDefined();
      expect(dbAlert.severity).toBe('critical');
      expect(dbAlert.message).toContain('Ansioso');
      expect(dbAlert.message).toContain('Nível 9/10');
      expect(dbAlert.message).toContain('Equipe: Backend');

      // ========================================
      // ASSERT: Verify emails sent to correct users
      // ========================================
      expect(mockEmailService.send).toHaveBeenCalledTimes(2); // GESTOR + ADMIN

      // Verify email content
      const emailCalls = mockEmailService.send.mock.calls;

      // Verify email subject contains severity prefix
      const emailSubjects = emailCalls.map((call) => call[0].subject);
      expect(emailSubjects[0]).toContain('[CRÍTICO]');

      // Verify email body contains alert message
      const emailHtml = emailCalls[0][0].html;
      expect(emailHtml).toContain('Severidade');
      expect(emailHtml).toContain('9/10');

      // ========================================
      // ASSERT: Verify notification details recorded
      // ========================================
      expect(alert.notifiedUsers).toHaveLength(2);
      expect(alert.notifiedUsers).toContain(savedGestor.id);
      expect(alert.notifiedUsers).toContain(savedAdmin.id);

      // Verify in database
      const updatedDbAlert = await typeormAlertRepository.findOne({
        where: { id: alert.id },
      });
      expect(updatedDbAlert.notifiedUsers).toHaveLength(2);
      expect(updatedDbAlert.notificationSentAt).toBeDefined();

      // ========================================
      // ACT: Resolve the alert
      // ========================================
      const resolvedAlert = await alertService.resolveAlert(
        alert.id,
        savedAdmin.id,
        'Conversei com o colaborador, situação sob controle',
      );

      // ========================================
      // ASSERT: Verify alert resolution
      // ========================================
      expect(resolvedAlert.isResolved).toBe(true);
      expect(resolvedAlert.resolvedBy).toBe(savedAdmin.id);
      expect(resolvedAlert.resolutionNotes).toBe(
        'Conversei com o colaborador, situação sob controle',
      );
      expect(resolvedAlert.resolvedAt).toBeDefined();

      // Verify resolution persisted in database
      const finalDbAlert = await typeormAlertRepository.findOne({
        where: { id: alert.id },
      });
      expect(finalDbAlert.isResolved).toBe(true);
      expect(finalDbAlert.resolvedBy).toBe(savedAdmin.id);
    });

    it('should return null when no managers exist for organization', async () => {
      // Create organization WITHOUT any managers
      const { savedOrg, savedSubmission } = await runAsServiceRole(async () => {
        const orgFixture = createCompanyFixture({ name: 'No Managers Org' });
        const savedOrg = await typeormOrgRepository.save(orgFixture);

        // Create only a colaborador (no GESTOR or ADMIN)
        const colaboradorFixture = createUserFixture({
          email: 'lonely@nomanagers.com',
          supabaseUserId: '20000001-0000-0000-0000-000000000001',
        });
        const savedColaborador =
          await typeormUserRepository.save(colaboradorFixture);

        await roleRepository.assignRoleToUser({
          userId: savedColaborador.id,
          roleId: savedRoles.colaborador.id,
          organizationId: savedOrg.id,
          assignedBy: savedColaborador.id,
        });

        // Create submission
        const submissionSchema = new EmociogramaSubmissionSchema();
        submissionSchema.organizationId = savedOrg.id;
        submissionSchema.userId = savedColaborador.id;
        submissionSchema.emotionLevel = 8;
        submissionSchema.emotionEmoji = '😣';
        submissionSchema.categoryId = '00000000-0000-0000-0000-000000000001';
        submissionSchema.isAnonymous = true;
        submissionSchema.commentFlagged = false;
        submissionSchema.submittedAt = new Date();

        const savedSubmission =
          await typeormSubmissionRepository.save(submissionSchema);

        return { savedOrg, savedSubmission };
      });

      const submissionEntity = new EmociogramaSubmissionEntity({
        id: savedSubmission.id,
        organizationId: savedSubmission.organizationId,
        userId: savedSubmission.userId,
        emotionLevel: savedSubmission.emotionLevel,
        emotionEmoji: savedSubmission.emotionEmoji,
        categoryId: savedSubmission.categoryId,
        isAnonymous: savedSubmission.isAnonymous,
        commentFlagged: savedSubmission.commentFlagged,
        submittedAt: savedSubmission.submittedAt,
        createdAt: savedSubmission.createdAt,
        updatedAt: savedSubmission.updatedAt,
      });

      // ACT
      const alert = await alertService.triggerEmotionalAlert(submissionEntity);

      // ASSERT
      expect(alert).toBeNull();
      expect(mockEmailService.send).not.toHaveBeenCalled();

      // Verify no alert was created in database
      const dbAlerts = await typeormAlertRepository.find({
        where: { submissionId: savedSubmission.id },
      });
      expect(dbAlerts).toHaveLength(0);
    });

    it('should handle different severity levels correctly', async () => {
      const { savedOrg, savedManager } = await runAsServiceRole(async () => {
        const orgFixture = createCompanyFixture({ name: 'Severity Test Org' });
        const savedOrg = await typeormOrgRepository.save(orgFixture);

        const managerFixture = createUserFixture({
          email: 'manager@severity.com',
          supabaseUserId: '30000001-0000-0000-0000-000000000001',
        });
        const savedManager = await typeormUserRepository.save(managerFixture);

        await roleRepository.assignRoleToUser({
          userId: savedManager.id,
          roleId: savedRoles.gestor.id,
          organizationId: savedOrg.id,
          assignedBy: savedManager.id,
        });

        return { savedOrg, savedManager };
      });

      // Test different emotion levels and expected severities
      const testCases = [
        { level: 6, expectedSeverity: 'medium', expectedPrefix: '[ATENÇÃO]' },
        { level: 7, expectedSeverity: 'high', expectedPrefix: '[URGENTE]' },
        { level: 8, expectedSeverity: 'high', expectedPrefix: '[URGENTE]' },
        { level: 9, expectedSeverity: 'critical', expectedPrefix: '[CRÍTICO]' },
        {
          level: 10,
          expectedSeverity: 'critical',
          expectedPrefix: '[CRÍTICO]',
        },
      ];

      for (const testCase of testCases) {
        // Clear previous mocks
        mockEmailService.send.mockClear();

        const savedSubmission = await runAsServiceRole(async () => {
          const submissionSchema = new EmociogramaSubmissionSchema();
          submissionSchema.organizationId = savedOrg.id;
          submissionSchema.userId = savedManager.id;
          submissionSchema.emotionLevel = testCase.level;
          submissionSchema.emotionEmoji = '😟';
          submissionSchema.categoryId = '00000000-0000-0000-0000-000000000001';
          submissionSchema.isAnonymous = false;
          submissionSchema.commentFlagged = false;
          submissionSchema.submittedAt = new Date();

          return typeormSubmissionRepository.save(submissionSchema);
        });

        const submissionEntity = new EmociogramaSubmissionEntity({
          id: savedSubmission.id,
          organizationId: savedSubmission.organizationId,
          userId: savedSubmission.userId,
          emotionLevel: savedSubmission.emotionLevel,
          emotionEmoji: savedSubmission.emotionEmoji,
          categoryId: savedSubmission.categoryId,
          isAnonymous: savedSubmission.isAnonymous,
          commentFlagged: savedSubmission.commentFlagged,
          submittedAt: savedSubmission.submittedAt,
          createdAt: savedSubmission.createdAt,
          updatedAt: savedSubmission.updatedAt,
        });

        const alert =
          await alertService.triggerEmotionalAlert(submissionEntity);

        expect(alert).not.toBeNull();
        expect(alert.severity).toBe(testCase.expectedSeverity);

        // Verify email subject prefix
        expect(mockEmailService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            subject: expect.stringContaining(testCase.expectedPrefix),
          }),
        );

        // Clean up for next iteration
        await runAsServiceRole(async () => {
          await typeormAlertRepository.delete({ id: alert.id });
          await typeormSubmissionRepository.delete({ id: savedSubmission.id });
        });
      }
    });

    it('should handle email failures gracefully', async () => {
      const { savedOrg, savedManager, savedSubmission } =
        await runAsServiceRole(async () => {
          const orgFixture = createCompanyFixture({ name: 'Email Fail Org' });
          const savedOrg = await typeormOrgRepository.save(orgFixture);

          const managerFixture = createUserFixture({
            email: 'manager@emailfail.com',
            supabaseUserId: '40000001-0000-0000-0000-000000000001',
          });
          const savedManager = await typeormUserRepository.save(managerFixture);

          await roleRepository.assignRoleToUser({
            userId: savedManager.id,
            roleId: savedRoles.gestor.id,
            organizationId: savedOrg.id,
            assignedBy: savedManager.id,
          });

          const submissionSchema = new EmociogramaSubmissionSchema();
          submissionSchema.organizationId = savedOrg.id;
          submissionSchema.userId = savedManager.id;
          submissionSchema.emotionLevel = 8;
          submissionSchema.emotionEmoji = '😣';
          submissionSchema.categoryId = '00000000-0000-0000-0000-000000000001';
          submissionSchema.isAnonymous = false;
          submissionSchema.commentFlagged = false;
          submissionSchema.submittedAt = new Date();

          const savedSubmission =
            await typeormSubmissionRepository.save(submissionSchema);

          return { savedOrg, savedManager, savedSubmission };
        });

      // Mock email to fail
      mockEmailService.send.mockRejectedValue(
        new Error('SMTP connection failed'),
      );

      const submissionEntity = new EmociogramaSubmissionEntity({
        id: savedSubmission.id,
        organizationId: savedSubmission.organizationId,
        userId: savedSubmission.userId,
        emotionLevel: savedSubmission.emotionLevel,
        emotionEmoji: savedSubmission.emotionEmoji,
        categoryId: savedSubmission.categoryId,
        isAnonymous: savedSubmission.isAnonymous,
        commentFlagged: savedSubmission.commentFlagged,
        submittedAt: savedSubmission.submittedAt,
        createdAt: savedSubmission.createdAt,
        updatedAt: savedSubmission.updatedAt,
      });

      // ACT - Should not throw
      const alert = await alertService.triggerEmotionalAlert(submissionEntity);

      // ASSERT - Alert should still be created
      expect(alert).toBeDefined();
      expect(alert.id).toBeDefined();

      // Alert exists in database
      const dbAlert = await typeormAlertRepository.findOne({
        where: { id: alert.id },
      });
      expect(dbAlert).toBeDefined();

      // No users were notified (email failed)
      expect(alert.notifiedUsers).toHaveLength(0);
    });
  });

  describe('Alert Resolution Edge Cases', () => {
    it('should throw NotFoundException for non-existent alert', async () => {
      await expect(
        alertService.resolveAlert(
          '00000000-0000-0000-0000-000000000999',
          'user-123',
        ),
      ).rejects.toThrow('não encontrado');
    });

    it('should throw ConflictException when resolving already resolved alert', async () => {
      // Create and resolve an alert
      const { savedOrg, savedManager, savedSubmission } =
        await runAsServiceRole(async () => {
          const orgFixture = createCompanyFixture({
            name: 'Double Resolve Org',
          });
          const savedOrg = await typeormOrgRepository.save(orgFixture);

          const managerFixture = createUserFixture({
            email: 'manager@doubleresolve.com',
            supabaseUserId: '50000001-0000-0000-0000-000000000001',
          });
          const savedManager = await typeormUserRepository.save(managerFixture);

          await roleRepository.assignRoleToUser({
            userId: savedManager.id,
            roleId: savedRoles.gestor.id,
            organizationId: savedOrg.id,
            assignedBy: savedManager.id,
          });

          const submissionSchema = new EmociogramaSubmissionSchema();
          submissionSchema.organizationId = savedOrg.id;
          submissionSchema.userId = savedManager.id;
          submissionSchema.emotionLevel = 7;
          submissionSchema.emotionEmoji = '😢';
          submissionSchema.categoryId = '00000000-0000-0000-0000-000000000001';
          submissionSchema.isAnonymous = false;
          submissionSchema.commentFlagged = false;
          submissionSchema.submittedAt = new Date();

          const savedSubmission =
            await typeormSubmissionRepository.save(submissionSchema);

          return { savedOrg, savedManager, savedSubmission };
        });

      const submissionEntity = new EmociogramaSubmissionEntity({
        id: savedSubmission.id,
        organizationId: savedSubmission.organizationId,
        userId: savedSubmission.userId,
        emotionLevel: savedSubmission.emotionLevel,
        emotionEmoji: savedSubmission.emotionEmoji,
        categoryId: savedSubmission.categoryId,
        isAnonymous: savedSubmission.isAnonymous,
        commentFlagged: savedSubmission.commentFlagged,
        submittedAt: savedSubmission.submittedAt,
        createdAt: savedSubmission.createdAt,
        updatedAt: savedSubmission.updatedAt,
      });

      // Create alert
      const alert = await alertService.triggerEmotionalAlert(submissionEntity);
      expect(alert).not.toBeNull();

      // Resolve first time - should succeed
      await alertService.resolveAlert(
        alert.id,
        savedManager.id,
        'First resolution',
      );

      // Try to resolve again - should throw ConflictException
      await expect(
        alertService.resolveAlert(
          alert.id,
          savedManager.id,
          'Second resolution',
        ),
      ).rejects.toThrow('já foi resolvido');
    });
  });
});
