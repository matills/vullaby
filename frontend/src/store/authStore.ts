import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const getBusinessIdForUser = async (authId: string): Promise<string | undefined> => {
  try {
    const { data, error } = await supabase
      .from('business_users')
      .select('business_id')
      .eq('auth_id', authId)
      .single();

    if (error) {
      console.error('Error fetching business_id:', error);
      return undefined;
    }

    return data?.business_id;
  } catch (error) {
    console.error('Error in getBusinessIdForUser:', error);
    return undefined;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      const businessId = await getBusinessIdForUser(data.user.id);

      if (businessId) {
        localStorage.setItem('businessId', businessId);
      }

      set({
        user: {
          id: data.user.id,
          email: data.user.email!,
          businessId,
        },
      });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('businessId');
    set({ user: null });
  },

  checkSession: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const businessId = await getBusinessIdForUser(session.user.id);

        if (businessId) {
          localStorage.setItem('businessId', businessId);
        }

        set({
          user: {
            id: session.user.id,
            email: session.user.email!,
            businessId,
          },
          loading: false,
        });
      } else {
        set({ user: null, loading: false });
      }
    } catch (error) {
      console.error('Error checking session:', error);
      set({ user: null, loading: false });
    }
  },
}));
