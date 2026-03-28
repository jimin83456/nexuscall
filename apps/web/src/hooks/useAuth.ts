import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const { user, token } = useAuthStore();
  
  return { 
    user, 
    token, 
    isAuthenticated: !!token 
  };
}
