import { RoleManager, Permission } from './roleManager';
import { userRepository } from '../repositories/userRepository';
import { UserRole, ClubRole } from '../types';

// Mock the userRepository
jest.mock('../repositories/userRepository', () => ({
  userRepository: {
    getUserById: jest.fn(),
    updateUser: jest.fn(),
  },
}));

describe('RoleManager', () => {
  let roleManager: RoleManager;

  beforeEach(() => {
    roleManager = new RoleManager();
    jest.clearAllMocks();
  });

  describe('assignRole', () => {
    it('should assign role when assigner is administrator', async () => {
      const userId = 'user-123';
      const assignerId = 'admin-456';

      (userRepository.getUserById as jest.Mock).mockImplementation((id: string) => {
        if (id === userId) {
          return Promise.resolve({
            userId,
            email: 'user@example.com',
            role: UserRole.STUDENT,
          });
        }
        if (id === assignerId) {
          return Promise.resolve({
            userId: assignerId,
            email: 'admin@example.com',
            role: UserRole.ADMINISTRATOR,
          });
        }
        return Promise.resolve(null);
      });

      (userRepository.updateUser as jest.Mock).mockResolvedValue(undefined);

      await roleManager.assignRole(userId, UserRole.CLUB_OFFICER, assignerId);

      expect(userRepository.updateUser).toHaveBeenCalledWith(userId, {
        role: UserRole.CLUB_OFFICER,
      });
    });

    it('should reject role assignment when assigner is not administrator', async () => {
      const userId = 'user-123';
      const assignerId = 'officer-456';

      (userRepository.getUserById as jest.Mock).mockImplementation((id: string) => {
        if (id === userId) {
          return Promise.resolve({
            userId,
            email: 'user@example.com',
            role: UserRole.STUDENT,
          });
        }
        if (id === assignerId) {
          return Promise.resolve({
            userId: assignerId,
            email: 'officer@example.com',
            role: UserRole.CLUB_OFFICER,
          });
        }
        return Promise.resolve(null);
      });

      await expect(roleManager.assignRole(userId, UserRole.CLUB_OFFICER, assignerId))
        .rejects.toThrow('Only administrators can assign roles');
    });

    it('should reject role assignment when user not found', async () => {
      const userId = 'non-existent';
      const assignerId = 'admin-456';

      (userRepository.getUserById as jest.Mock).mockImplementation((id: string) => {
        if (id === assignerId) {
          return Promise.resolve({
            userId: assignerId,
            email: 'admin@example.com',
            role: UserRole.ADMINISTRATOR,
          });
        }
        return Promise.resolve(null);
      });

      await expect(roleManager.assignRole(userId, UserRole.CLUB_OFFICER, assignerId))
        .rejects.toThrow('User not found');
    });
  });

  describe('hasPermission', () => {
    it('should return true for student with VIEW_PROFILE permission', () => {
      expect(roleManager.hasPermission(UserRole.STUDENT, Permission.VIEW_PROFILE)).toBe(true);
    });

    it('should return false for student with MANAGE_USERS permission', () => {
      expect(roleManager.hasPermission(UserRole.STUDENT, Permission.MANAGE_USERS)).toBe(false);
    });

    it('should return true for administrator with all permissions', () => {
      expect(roleManager.hasPermission(UserRole.ADMINISTRATOR, Permission.MANAGE_USERS)).toBe(true);
      expect(roleManager.hasPermission(UserRole.ADMINISTRATOR, Permission.SYSTEM_CONFIGURATION)).toBe(true);
    });

    it('should return true for club officer with CREATE_EVENT permission', () => {
      expect(roleManager.hasPermission(UserRole.CLUB_OFFICER, Permission.CREATE_EVENT)).toBe(true);
    });
  });

  describe('getPermissions', () => {
    it('should return all permissions for a role', () => {
      const permissions = roleManager.getPermissions(UserRole.STUDENT);
      expect(permissions.has(Permission.VIEW_PROFILE)).toBe(true);
      expect(permissions.has(Permission.RSVP_TO_EVENT)).toBe(true);
      expect(permissions.has(Permission.MANAGE_USERS)).toBe(false);
    });
  });

  describe('isRoleHigher', () => {
    it('should return true when administrator compared to student', () => {
      expect(roleManager.isRoleHigher(UserRole.ADMINISTRATOR, UserRole.STUDENT)).toBe(true);
    });

    it('should return true when club officer compared to student', () => {
      expect(roleManager.isRoleHigher(UserRole.CLUB_OFFICER, UserRole.STUDENT)).toBe(true);
    });

    it('should return false when student compared to administrator', () => {
      expect(roleManager.isRoleHigher(UserRole.STUDENT, UserRole.ADMINISTRATOR)).toBe(false);
    });

    it('should return false when comparing same roles', () => {
      expect(roleManager.isRoleHigher(UserRole.STUDENT, UserRole.STUDENT)).toBe(false);
    });
  });

  describe('isRoleEqualOrHigher', () => {
    it('should return true when comparing same roles', () => {
      expect(roleManager.isRoleEqualOrHigher(UserRole.STUDENT, UserRole.STUDENT)).toBe(true);
    });

    it('should return true when administrator compared to student', () => {
      expect(roleManager.isRoleEqualOrHigher(UserRole.ADMINISTRATOR, UserRole.STUDENT)).toBe(true);
    });
  });

  describe('isClubRoleHigher', () => {
    it('should return true when president compared to member', () => {
      expect(roleManager.isClubRoleHigher(ClubRole.PRESIDENT, ClubRole.MEMBER)).toBe(true);
    });

    it('should return true when vice president compared to secretary', () => {
      expect(roleManager.isClubRoleHigher(ClubRole.VICE_PRESIDENT, ClubRole.SECRETARY)).toBe(true);
    });

    it('should return false when member compared to president', () => {
      expect(roleManager.isClubRoleHigher(ClubRole.MEMBER, ClubRole.PRESIDENT)).toBe(false);
    });
  });

  describe('enforcePermission', () => {
    it('should not throw when user has permission', () => {
      const user = {
        userId: 'user-123',
        email: 'user@example.com',
        role: UserRole.ADMINISTRATOR,
      } as any;

      expect(() => roleManager.enforcePermission(user, Permission.MANAGE_USERS)).not.toThrow();
    });

    it('should throw when user lacks permission', () => {
      const user = {
        userId: 'user-123',
        email: 'user@example.com',
        role: UserRole.STUDENT,
      } as any;

      expect(() => roleManager.enforcePermission(user, Permission.MANAGE_USERS))
        .toThrow('User does not have permission: MANAGE_USERS');
    });
  });

  describe('getRoleLevel', () => {
    it('should return correct hierarchy levels', () => {
      expect(roleManager.getRoleLevel(UserRole.STUDENT)).toBe(1);
      expect(roleManager.getRoleLevel(UserRole.CLUB_OFFICER)).toBe(2);
      expect(roleManager.getRoleLevel(UserRole.ADMINISTRATOR)).toBe(3);
    });
  });

  describe('getClubRoleLevel', () => {
    it('should return correct club role hierarchy levels', () => {
      expect(roleManager.getClubRoleLevel(ClubRole.MEMBER)).toBe(1);
      expect(roleManager.getClubRoleLevel(ClubRole.SECRETARY)).toBe(2);
      expect(roleManager.getClubRoleLevel(ClubRole.VICE_PRESIDENT)).toBe(3);
      expect(roleManager.getClubRoleLevel(ClubRole.PRESIDENT)).toBe(4);
    });
  });
});
