import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * Hook to get the current business ID from auth store or localStorage
 */
export function useBusinessId() {
  const user = useAuthStore((state) => state.user);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    // Try to get from auth store first
    if (user?.businessId) {
      setBusinessId(user.businessId);
      return;
    }

    // Fallback to localStorage
    const storedBusinessId = localStorage.getItem('businessId');
    setBusinessId(storedBusinessId);
  }, [user]);

  return businessId;
}
