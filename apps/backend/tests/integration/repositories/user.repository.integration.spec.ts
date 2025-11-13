import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../src/database/prisma.service';
import { PrismaUserRepository } from '../../../src/modules/user/infrastructure/repositories/PrismaUser.repository';
import { UserEntity, Role, UserStatus } from '../../../src/modules/user/domain/entities/User.entity';
import { Email } from '../../../src/modules/user/domain/value-objects/Email.vo';
import { TestDatabaseHelper } from '../../helpers/test-database.helper';

describe('PrismaUserRepository Integration Tests', () => {
  let repository: PrismaUserRepository;
  let prismaService: PrismaService;

  beforeAll(async () => {
    // Connect to test database
    await TestDatabaseHelper.connect();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        PrismaUserRepository,
      ],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
    repository = module.get<PrismaUserRepository>(PrismaUserRepository);
  });

  beforeEach(async () => {
    // Clean database before each test for isolation
    await TestDatabaseHelper.cleanDatabase();
  });

  afterAll(async () => {
    // Disconnect after all tests
    await TestDatabaseHelper.disconnect();
    await prismaService.$disconnect();
  });

  describe('create', () => {
    it('should create a new user in database', async () => {
      // Arrange
      const user = new UserEntity(
        'user-create-1',
        Email.create('create@example.com'),
        'hashedPassword123',
        'John',
        'Doe',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date(),
        new Date(),
        0
      );

      // Act
      const createdUser = await repository.create(user);

      // Assert
      expect(createdUser).toBeDefined();
      expect(createdUser.id).toBe('user-create-1');
      expect(createdUser.email.getValue()).toBe('create@example.com');
      expect(createdUser.firstName).toBe('John');
      expect(createdUser.lastName).toBe('Doe');
      expect(createdUser.role).toBe(Role.MEMBER);
      expect(createdUser.status).toBe(UserStatus.ACTIVE);

      // Verify it's actually in database
      const foundUser = await repository.findById('user-create-1');
      expect(foundUser).not.toBeNull();
      expect(foundUser?.email.getValue()).toBe('create@example.com');
    });

    it('should throw error when creating user with duplicate email', async () => {
      // Arrange
      const user1 = new UserEntity(
        'user-dup-1',
        Email.create('duplicate@example.com'),
        'hashedPassword123',
        'First',
        'User',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date(),
        new Date(),
        0
      );

      const user2 = new UserEntity(
        'user-dup-2',
        Email.create('duplicate@example.com'), // Same email
        'hashedPassword456',
        'Second',
        'User',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date(),
        new Date(),
        0
      );

      // Act
      await repository.create(user1);

      // Assert - Should throw unique constraint violation
      await expect(repository.create(user2)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      // Arrange
      const user = new UserEntity(
        'user-findbyid-1',
        Email.create('findbyid@example.com'),
        'hashedPassword123',
        'Jane',
        'Smith',
        Role.ADMIN,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date(),
        new Date(),
        0
      );
      await repository.create(user);

      // Act
      const foundUser = await repository.findById('user-findbyid-1');

      // Assert
      expect(foundUser).not.toBeNull();
      expect(foundUser?.id).toBe('user-findbyid-1');
      expect(foundUser?.email.getValue()).toBe('findbyid@example.com');
      expect(foundUser?.firstName).toBe('Jane');
      expect(foundUser?.role).toBe(Role.ADMIN);
    });

    it('should return null for non-existent user', async () => {
      // Act
      const foundUser = await repository.findById('nonexistent-user-id');

      // Assert
      expect(foundUser).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      // Arrange
      const user = new UserEntity(
        'user-email-1',
        Email.create('findemail@example.com'),
        'hashedPassword123',
        'Bob',
        'Johnson',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date(),
        new Date(),
        0
      );
      await repository.create(user);

      // Act
      const foundUser = await repository.findByEmail(Email.create('findemail@example.com'));

      // Assert
      expect(foundUser).not.toBeNull();
      expect(foundUser?.id).toBe('user-email-1');
      expect(foundUser?.email.getValue()).toBe('findemail@example.com');
      expect(foundUser?.firstName).toBe('Bob');
    });

    it('should return null for non-existent email', async () => {
      // Act
      const foundUser = await repository.findByEmail(Email.create('nonexistent@example.com'));

      // Assert
      expect(foundUser).toBeNull();
    });

    it('should handle case-sensitive email search correctly', async () => {
      // Arrange
      const user = new UserEntity(
        'user-case-1',
        Email.create('CaseSensitive@example.com'),
        'hashedPassword123',
        'Case',
        'Test',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date(),
        new Date(),
        0
      );
      await repository.create(user);

      // Act - Search with different case
      const foundUser = await repository.findByEmail(Email.create('CaseSensitive@example.com'));

      // Assert
      expect(foundUser).not.toBeNull();
      expect(foundUser?.email.getValue()).toBe('CaseSensitive@example.com');
    });
  });

  describe('findByRole', () => {
    it('should find all users with specific role', async () => {
      // Arrange
      const admin1 = new UserEntity(
        'admin-1',
        Email.create('admin1@example.com'),
        'hash1',
        'Admin',
        'One',
        Role.ADMIN,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date(),
        new Date(),
        0
      );

      const admin2 = new UserEntity(
        'admin-2',
        Email.create('admin2@example.com'),
        'hash2',
        'Admin',
        'Two',
        Role.ADMIN,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date(),
        new Date(),
        0
      );

      const member = new UserEntity(
        'member-1',
        Email.create('member1@example.com'),
        'hash3',
        'Member',
        'One',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date(),
        new Date(),
        0
      );

      await repository.create(admin1);
      await repository.create(admin2);
      await repository.create(member);

      // Act
      const admins = await repository.findByRole(Role.ADMIN);

      // Assert
      expect(admins).toHaveLength(2);
      expect(admins.every(u => u.role === Role.ADMIN)).toBe(true);
      expect(admins.map(u => u.id).sort()).toEqual(['admin-1', 'admin-2']);
    });

    it('should return empty array when no users have the role', async () => {
      // Act
      const superAdmins = await repository.findByRole(Role.SUPER_ADMIN);

      // Assert
      expect(superAdmins).toEqual([]);
    });
  });

  describe('findByAccountId', () => {
    it('should find all users in specific account', async () => {
      // Arrange
      const user1 = new UserEntity(
        'user-acc-1',
        Email.create('user1@account.com'),
        'hash1',
        'User',
        'One',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date(),
        new Date(),
        0
      );

      const user2 = new UserEntity(
        'user-acc-2',
        Email.create('user2@account.com'),
        'hash2',
        'User',
        'Two',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date(),
        new Date(),
        0
      );

      await repository.create(user1);
      await repository.create(user2);

      // Act
      const users = await repository.findByAccountId('acc_employees_test');

      // Assert
      expect(users).toHaveLength(2);
      expect(users.every(u => u.accountId === 'acc_employees_test')).toBe(true);
    });

    it('should return empty array for account with no users', async () => {
      // Act
      const users = await repository.findByAccountId('nonexistent-account');

      // Assert
      expect(users).toEqual([]);
    });
  });

  describe('findByStatus', () => {
    it('should find all users with specific status', async () => {
      // Arrange
      const active = new UserEntity(
        'user-active-1',
        Email.create('active@example.com'),
        'hash1',
        'Active',
        'User',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date(),
        new Date(),
        0
      );

      const suspended = new UserEntity(
        'user-suspended-1',
        Email.create('suspended@example.com'),
        'hash2',
        'Suspended',
        'User',
        Role.MEMBER,
        UserStatus.SUSPENDED,
        'acc_employees_test',
        new Date(),
        new Date(),
        0
      );

      await repository.create(active);
      await repository.create(suspended);

      // Act
      const suspendedUsers = await repository.findByStatus(UserStatus.SUSPENDED);

      // Assert
      expect(suspendedUsers).toHaveLength(1);
      expect(suspendedUsers[0]!.status).toBe(UserStatus.SUSPENDED);
      expect(suspendedUsers[0]!.id).toBe('user-suspended-1');
    });
  });

  describe('findAll', () => {
    it('should return paginated users ordered by createdAt desc', async () => {
      // Arrange - Create users with different timestamps
      const user1 = new UserEntity(
        'user-page-1',
        Email.create('user1@page.com'),
        'hash1',
        'First',
        'User',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date('2024-01-01'),
        new Date(),
        0
      );

      const user2 = new UserEntity(
        'user-page-2',
        Email.create('user2@page.com'),
        'hash2',
        'Second',
        'User',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date('2024-01-02'),
        new Date(),
        0
      );

      const user3 = new UserEntity(
        'user-page-3',
        Email.create('user3@page.com'),
        'hash3',
        'Third',
        'User',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date('2024-01-03'),
        new Date(),
        0
      );

      await repository.create(user1);
      await repository.create(user2);
      await repository.create(user3);

      // Act - Get first 2 users
      const firstPage = await repository.findAll(2, 0);

      // Assert - Should be ordered by createdAt desc (newest first)
      expect(firstPage).toHaveLength(2);
      expect(firstPage[0]!.id).toBe('user-page-3'); // Most recent
      expect(firstPage[1]!.id).toBe('user-page-2');

      // Act - Get second page
      const secondPage = await repository.findAll(2, 2);

      // Assert
      expect(secondPage).toHaveLength(1);
      expect(secondPage[0]!.id).toBe('user-page-1');
    });

    it('should handle empty result set', async () => {
      // Act
      const users = await repository.findAll(10, 0);

      // Assert
      expect(users).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      // Arrange
      const user = new UserEntity(
        'user-update-1',
        Email.create('update@example.com'),
        'hash1',
        'Original',
        'Name',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date(),
        new Date(),
        0
      );
      await repository.create(user);

      // Act
      const updatedUser = await repository.update('user-update-1', {
        firstName: 'Updated',
        lastName: 'NameChanged',
        status: UserStatus.SUSPENDED,
      });

      // Assert
      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.lastName).toBe('NameChanged');
      expect(updatedUser.status).toBe(UserStatus.SUSPENDED);

      // Verify it's persisted in database
      const foundUser = await repository.findById('user-update-1');
      expect(foundUser?.firstName).toBe('Updated');
      expect(foundUser?.status).toBe(UserStatus.SUSPENDED);
    });

    it('should increment tokenVersion', async () => {
      // Arrange
      const user = new UserEntity(
        'user-token-1',
        Email.create('token@example.com'),
        'hash1',
        'Token',
        'User',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date(),
        new Date(),
        5 // Initial tokenVersion
      );
      await repository.create(user);

      // Act
      const updatedUser = await repository.update('user-token-1', {
        tokenVersion: 6,
      });

      // Assert
      expect(updatedUser.tokenVersion).toBe(6);

      const foundUser = await repository.findById('user-token-1');
      expect(foundUser?.tokenVersion).toBe(6);
    });

    it('should throw error when updating non-existent user', async () => {
      // Act & Assert
      await expect(
        repository.update('nonexistent-id', { firstName: 'Test' })
      ).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete user from database', async () => {
      // Arrange
      const user = new UserEntity(
        'user-delete-1',
        Email.create('delete@example.com'),
        'hash1',
        'Delete',
        'User',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date(),
        new Date(),
        0
      );
      await repository.create(user);

      // Verify user exists
      const userBefore = await repository.findById('user-delete-1');
      expect(userBefore).not.toBeNull();

      // Act
      await repository.delete('user-delete-1');

      // Assert
      const userAfter = await repository.findById('user-delete-1');
      expect(userAfter).toBeNull();
    });

    it('should throw error when deleting non-existent user', async () => {
      // Act & Assert
      await expect(repository.delete('nonexistent-id')).rejects.toThrow();
    });
  });

  describe('countByRole', () => {
    it('should count users by role', async () => {
      // Arrange
      const admin1 = new UserEntity(
        'count-admin-1',
        Email.create('countadmin1@example.com'),
        'hash1',
        'Admin',
        'One',
        Role.ADMIN,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date(),
        new Date(),
        0
      );

      const admin2 = new UserEntity(
        'count-admin-2',
        Email.create('countadmin2@example.com'),
        'hash2',
        'Admin',
        'Two',
        Role.ADMIN,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date(),
        new Date(),
        0
      );

      const member = new UserEntity(
        'count-member-1',
        Email.create('countmember1@example.com'),
        'hash3',
        'Member',
        'One',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date(),
        new Date(),
        0
      );

      await repository.create(admin1);
      await repository.create(admin2);
      await repository.create(member);

      // Act
      const adminCount = await repository.countByRole(Role.ADMIN);
      const memberCount = await repository.countByRole(Role.MEMBER);
      const superAdminCount = await repository.countByRole(Role.SUPER_ADMIN);

      // Assert
      expect(adminCount).toBe(2);
      expect(memberCount).toBe(1);
      expect(superAdminCount).toBe(0);
    });
  });

  describe('existsByEmail', () => {
    it('should return true if email exists', async () => {
      // Arrange
      const user = new UserEntity(
        'user-exists-1',
        Email.create('exists@example.com'),
        'hash1',
        'Exists',
        'User',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc_employees_test',
        new Date(),
        new Date(),
        0
      );
      await repository.create(user);

      // Act
      const exists = await repository.existsByEmail(Email.create('exists@example.com'));

      // Assert
      expect(exists).toBe(true);
    });

    it('should return false if email does not exist', async () => {
      // Act
      const exists = await repository.existsByEmail(Email.create('notexists@example.com'));

      // Assert
      expect(exists).toBe(false);
    });
  });
});
