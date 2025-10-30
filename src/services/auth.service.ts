import { supabase, supabaseAdmin } from '../config/database';
import { AppError } from '../middlewares/error.middleware';
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
  async registerBusiness(data: RegisterBusinessData) {
    if (!supabaseAdmin) {
      throw new AppError('Service not configured properly', 500);
    }

    let userId: string | null = null;
    let businessId: string | null = null;
    let employeeId: string | null = null;

    try {
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
      const userExists = existingUser?.users.find(u => u.email === data.email);

      if (userExists) {
        const { data: existingEmployee } = await supabaseAdmin
          .from('employees')
          .select('id')
          .eq('email', data.email)
          .single();

        if (!existingEmployee) {
          logger.info(`Cleaning up orphaned user: ${userExists.id}`);
          await supabaseAdmin.auth.admin.deleteUser(userExists.id);
        } else {
          throw new AppError('A user with this email address has already been registered', 400);
        }
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          business_name: data.businessName,
          owner_name: data.ownerName,
        },
      });

      if (authError) {
        logger.error('Auth signup error:', authError);
        throw new AppError(authError.message, 400);
      }

      if (!authData.user) {
        throw new AppError('Failed to create user', 400);
      }

      userId = authData.user.id;
      logger.info(`User created: ${userId}`);

      const { data: business, error: businessError } = await supabaseAdmin
        .from('businesses')
        .insert([{
          name: data.businessName,
          phone: data.phone,
          email: data.email,
          timezone: data.timezone || 'America/Argentina/Buenos_Aires',
        }])
        .select()
        .single();

      if (businessError) {
        logger.error('Business creation error:', businessError);
        throw new AppError(businessError.message || 'Failed to create business', 500);
      }

      if (!business) {
        throw new AppError('Failed to create business', 500);
      }

      businessId = business.id;
      logger.info(`Business created: ${businessId}`);

      const { data: employee, error: employeeError } = await supabaseAdmin
        .from('employees')
        .insert([{
          business_id: business.id,
          name: data.ownerName,
          email: data.email,
          phone: data.phone,
          role: 'admin',
          is_active: true,
        }])
        .select()
        .single();

      if (employeeError) {
        logger.error('Employee creation error:', employeeError);
        throw new AppError(employeeError.message || 'Failed to create employee', 500);
      }

      if (!employee) {
        throw new AppError('Failed to create employee', 500);
      }

      employeeId = employee.id;
      logger.info(`Employee created: ${employeeId}`);

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          business_id: business.id,
          employee_id: employee.id,
          role: 'admin',
        },
      });

      if (updateError) {
        logger.warn('Failed to update user metadata:', updateError);
      } else {
        logger.info(`User metadata updated for: ${userId}`);
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

      if (employeeId || businessId) {
        try {
          if (businessId) {
            await supabaseAdmin.from('employees').delete().eq('business_id', businessId);
            await supabaseAdmin.from('businesses').delete().eq('id', businessId);
            logger.info(`Rolled back business: ${businessId}`);
          }
        } catch (rollbackError) {
          logger.error('Failed to rollback business:', rollbackError);
        }
      }

      if (userId) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId);
          logger.info(`Rolled back user: ${userId}`);
        } catch (rollbackError) {
          logger.error('Failed to rollback user:', rollbackError);
        }
      }

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

      if (authError) {
        logger.error('Supabase auth error:', {
          message: authError.message,
          status: authError.status,
          name: authError.name,
        });
        throw new AppError('Invalid credentials', 401);
      }

      if (!authData.user) {
        logger.error('No user returned from Supabase');
        throw new AppError('Invalid credentials', 401);
      }

      logger.info(`User authenticated: ${authData.user.id}`);

      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*, business:businesses(*)')
        .eq('email', data.email)
        .single();

      if (employeeError) {
        logger.error('Employee fetch error:', {
          code: employeeError.code,
          message: employeeError.message,
          details: employeeError.details,
        });
      }

      if (!employee) {
        logger.warn(`User ${data.email} authenticated but no employee record found`);
      } else {
        logger.info(`Employee found: ${employee.id}`);
      }

      return {
        user: authData.user,
        session: authData.session,
        employee,
      };
    } catch (error) {
      logger.error('Login error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Login failed', 401);
    }
  }

  async logout(token: string) {
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
        throw new AppError('Invalid refresh token', 401);
      }

      return data.session;
    } catch (error) {
      logger.error('Refresh token error:', error);
      throw new AppError('Token refresh failed', 401);
    }
  }

  async resetPassword(email: string) {
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