import { AuthService } from '../../services/auth.service';
import { TestFactory } from '../helpers/test-factory';
import { createMockSupabase, MockSupabaseClient } from '../helpers/supabase.mock';
import { ConflictError, UnauthorizedError, AppError } from '../../middlewares/error.middleware';

jest.mock('../../config/database', () => {
  const mockClient = createMockSupabase();
  return {
    supabase: mockClient,
    supabaseAdmin: mockClient,
  };
});

describe('AuthService', () => {
  let authService: AuthService;
  let mockSupabase: MockSupabaseClient;

  beforeEach(() => {
    const { supabaseAdmin } = require('../../config/database');
    mockSupabase = supabaseAdmin;
    mockSupabase.clearData();
    mockSupabase.clearAuthUser();
    authService = new AuthService();
  });

  describe('registerBusiness', () => {
    const validRegistrationData = {
      businessName: 'Test Business',
      email: 'owner@test.com',
      password: 'SecurePass123!',
      phone: '+5491234567890',
      ownerName: 'John Doe',
      timezone: 'America/Argentina/Buenos_Aires',
    };

    it('should register a new business successfully', async () => {
      const result = await authService.registerBusiness(validRegistrationData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('business');
      expect(result).toHaveProperty('employee');
      expect(result.user.email).toBe(validRegistrationData.email);
      expect(result.business.name).toBe(validRegistrationData.businessName);
      expect(result.employee.role).toBe('admin');
    });

    it('should create business with correct timezone', async () => {
      const result = await authService.registerBusiness(validRegistrationData);

      expect(result.business.timezone).toBe('America/Argentina/Buenos_Aires');
    });

    it('should set employee as admin by default', async () => {
      const result = await authService.registerBusiness(validRegistrationData);

      expect(result.employee.role).toBe('admin');
      expect(result.employee.is_active).toBe(true);
    });

    it('should link user metadata with business and employee', async () => {
      const result = await authService.registerBusiness(validRegistrationData);

      expect(result.user.user_metadata).toMatchObject({
        business_id: result.business.id,
        employee_id: result.employee.id,
        role: 'admin',
      });
    });

    it('should throw ConflictError if email already exists', async () => {
      await authService.registerBusiness(validRegistrationData);

      await expect(
        authService.registerBusiness(validRegistrationData)
      ).rejects.toThrow(ConflictError);
    });

    it('should rollback on business creation failure', async () => {
      const invalidData = {
        ...validRegistrationData,
        phone: '',
      };

      await expect(authService.registerBusiness(invalidData)).rejects.toThrow();

      const users = await mockSupabase.auth.admin.listUsers();
      expect(users.data.users).toHaveLength(0);
    });

    it('should cleanup orphaned user if employee record missing', async () => {
      mockSupabase.setAuthUser(TestFactory.createAuthUser({ email: validRegistrationData.email }));

      await authService.registerBusiness(validRegistrationData);

      const result = await authService.registerBusiness(validRegistrationData);
      expect(result.user.email).toBe(validRegistrationData.email);
    });
  });

  describe('login', () => {
    const credentials = {
      email: 'user@test.com',
      password: 'password123',
    };

    beforeEach(async () => {
      const business = TestFactory.createBusiness();
      const employee = TestFactory.createEmployee(business.id, { email: credentials.email });
      
      mockSupabase.seedData('businesses', [business]);
      mockSupabase.seedData('employees', [employee]);
      
      const user = TestFactory.createAuthUser({ email: credentials.email });
      const session = TestFactory.createSession(user.id);
      mockSupabase.setAuthUser(user, session);
    });

    it('should login successfully with valid credentials', async () => {
      const result = await authService.login(credentials);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('session');
      expect(result).toHaveProperty('employee');
      expect(result.user.email).toBe(credentials.email);
    });

    it('should return employee data with business info', async () => {
      const result = await authService.login(credentials);

      expect(result.employee).toBeDefined();
      expect(result.employee).toHaveProperty('business');
    });

    it('should throw UnauthorizedError with invalid credentials', async () => {
      const invalidCredentials = {
        email: 'wrong@test.com',
        password: 'wrongpass',
      };

      await expect(authService.login(invalidCredentials)).rejects.toThrow(UnauthorizedError);
    });

    it('should handle login when employee record is missing', async () => {
      mockSupabase.clearData('employees');

      const result = await authService.login(credentials);

      expect(result.employee).toBeNull();
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const result = await authService.logout('valid-token');

      expect(result).toEqual({ success: true });
    });

    it('should handle logout errors gracefully', async () => {
      mockSupabase.auth.signOut = jest.fn().mockRejectedValue(new Error('Logout failed'));

      await expect(authService.logout('token')).rejects.toThrow(AppError);
    });
  });

  describe('refreshToken', () => {
    beforeEach(() => {
      const user = TestFactory.createAuthUser();
      const session = TestFactory.createSession(user.id);
      mockSupabase.setAuthUser(user, session);
    });

    it('should refresh token successfully', async () => {
      const result = await authService.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });

    it('should throw UnauthorizedError with invalid refresh token', async () => {
      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email successfully', async () => {
      const result = await authService.resetPassword('user@test.com');

      expect(result).toEqual({ success: true });
    });

    it('should handle reset password errors', async () => {
      mockSupabase.auth.resetPasswordForEmail = jest.fn().mockRejectedValue(new Error('Failed'));

      await expect(authService.resetPassword('user@test.com')).rejects.toThrow(AppError);
    });
  });
});