import { create } from 'zustand';
import { supabase } from '../services/supabase';

interface User {
  id: string;
  email: string;
  businessId?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

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
      set({
        user: {
          id: data.user.id,
          email: data.user.email!,
        },
      });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  checkSession: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        set({
          user: {
            id: session.user.id,
            email: session.user.email!,
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
