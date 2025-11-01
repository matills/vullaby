import { supabase, supabaseAdmin } from '../config/database';
import { AppError, ConflictError, UnauthorizedError } from '../middlewares/error.middleware';
import logger from '../utils/logger';

interface RegisterBusinessData {
  businessName: string;
  email: string;
  password: string;
  phone: string;
  ownerName: string;
  timezone?: string;
}

interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  private async cleanupOrphanedUser(email: string): Promise<void> {
    if (!supabaseAdmin) return;

    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users?.users.find(u => u.email === email);

    if (!existingUser) return;

    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('email', email)
      .single();

    if (!employee) {
      logger.info(`Cleaning up orphaned user: ${existingUser.id}`);
      await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
    } else {
      throw new ConflictError('A user with this email address has already been registered');
    }
  }

  private async rollbackRegistration(userId: string | null, businessId: string | null): Promise<void> {
    if (!supabaseAdmin) return;

    try {
      if (businessId) {
        await supabaseAdmin.from('employees').delete().eq('business_id', businessId);
        await supabaseAdmin.from('businesses').delete().eq('id', businessId);
        logger.info(`Rolled back business: ${businessId}`);
      }

      if (userId) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        logger.info(`Rolled back user: ${userId}`);
      }
    } catch (error) {
      logger.error('Failed to rollback registration:', error);
    }
  }

  async registerBusiness(data: RegisterBusinessData) {
    if (!supabaseAdmin) {
      throw new AppError('Service not configured properly', 500);
    }

    let userId: string | null = null;
    let businessId: string | null = null;

    try {
      await this.cleanupOrphanedUser(data.email);

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          business_name: data.businessName,
          owner_name: data.ownerName,
        },
      });

      if (authError || !authData.user) {
        logger.error('Auth signup error:', authError);
        throw new AppError(authError?.message || 'Failed to create user', 400);
      }

      userId = authData.user.id;
      logger.info(`User created: ${userId}`);

      const { data: business, error: businessError } = await supabaseAdmin
        .from('businesses')
        .insert({
          name: data.businessName,
          phone: data.phone,
          email: data.email,
          timezone: data.timezone || 'America/Argentina/Buenos_Aires',
        })
        .select()
        .single();

      if (businessError || !business) {
        logger.error('Business creation error:', businessError);
        throw new AppError(businessError?.message || 'Failed to create business', 500);
      }

      businessId = business.id;
      logger.info(`Business created: ${businessId}`);

      const { data: employee, error: employeeError } = await supabaseAdmin
        .from('employees')
        .insert({
          business_id: business.id,
          name: data.ownerName,
          email: data.email,
          phone: data.phone,
          role: 'admin',
          is_active: true,
        })
        .select()
        .single();

      if (employeeError || !employee) {
        logger.error('Employee creation error:', employeeError);
        throw new AppError(employeeError?.message || 'Failed to create employee', 500);
      }

      logger.info(`Employee created: ${employee.id}`);

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          business_id: business.id,
          employee_id: employee.id,
          role: 'admin',
        },
      });

      if (updateError) {
        logger.warn('Failed to update user metadata:', updateError);
      }

      logger.info(`Registration complete for: ${data.email}`);

      return {
        user: authData.user,
        session: null,
        business,
        employee,
        message: 'Registration successful. Please login with your credentials.',
      };
    } catch (error) {
      logger.error('Registration error:', error);
      await this.rollbackRegistration(userId, businessId);

      if (error instanceof AppError) throw error;
      throw new AppError('Registration failed', 500);
    }
  }

  async login(data: LoginData) {
    try {
      logger.info(`Login attempt for: ${data.email}`);

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError || !authData.user) {
        logger.error('Authentication failed:', authError);
        throw new UnauthorizedError('Invalid credentials');
      }

      logger.info(`User authenticated: ${authData.user.id}`);

      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*, business:businesses(*)')
        .eq('email', data.email)
        .single();

      if (employeeError) {
        logger.error('Employee fetch error:', employeeError);
      }

      if (!employee) {
        logger.warn(`User ${data.email} authenticated but no employee record found`);
      }

      return {
        user: authData.user,
        session: authData.session,
        employee,
      };
    } catch (error) {
      logger.error('Login error:', error);
      if (error instanceof AppError) throw error;
      throw new UnauthorizedError('Login failed');
    }
  }

  async logout(token: string): Promise<{ success: boolean }> {
    try {
      await supabase.auth.signOut();
      return { success: true };
    } catch (error) {
      logger.error('Logout error:', error);
      throw new AppError('Logout failed', 500);
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      return data.session;
    } catch (error) {
      logger.error('Refresh token error:', error);
      throw new UnauthorizedError('Token refresh failed');
    }
  }

  async resetPassword(email: string): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw new AppError('Password reset failed', 500);
      return { success: true };
    } catch (error) {
      logger.error('Password reset error:', error);
      throw new AppError('Password reset failed', 500);
    }
  }
}