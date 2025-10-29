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
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });

      if (authError || !authData.user) {
        throw new AppError(authError?.message || 'Failed to create user', 400);
      }

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
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new AppError('Failed to create business', 500);
      }

      const { data: employee, error: employeeError } = await supabaseAdmin
        .from('employees')
        .insert({
          business_id: business.id,
          name: data.ownerName,
          email: data.email,
          role: 'admin',
          is_active: true,
        })
        .select()
        .single();

      if (employeeError || !employee) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        await supabaseAdmin.from('businesses').delete().eq('id', business.id);
        throw new AppError('Failed to create employee', 500);
      }

      await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
        user_metadata: {
          business_id: business.id,
          employee_id: employee.id,
          role: 'admin',
        },
      });

      logger.info(`New business registered: ${business.id}`);

      return {
        user: authData.user,
        business,
        employee,
      };
    } catch (error) {
      logger.error('Registration error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Registration failed', 500);
    }
  }

  async login(data: LoginData) {
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error || !authData.user) {
        throw new AppError('Invalid credentials', 401);
      }

      const { data: employee } = await supabase
        .from('employees')
        .select('*, businesses(*)')
        .eq('email', data.email)
        .single();

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
      const { error } = await supabase.auth.admin.signOut(token);
      if (error) throw new AppError('Logout failed', 500);
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