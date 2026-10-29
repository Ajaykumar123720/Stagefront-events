import { useState, useEffect } from 'react';
import { UserProfile } from '../types/api';
import { userService } from '../services/userService';
import { isFirebaseConfigured } from '../services/firebase';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => userService.getCurrentUser());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = userService.subscribe((user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await userService.login(email, password);
      return user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (fullName: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await userService.register(fullName, email, password);
      return user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await userService.logout();
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await userService.refreshUserProfile();
      return user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to refresh user profile';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    currentUser,
    isAuthenticated: !!currentUser,
    isAdmin: (currentUser?.role || '').toLowerCase() === 'admin',
    isFirebaseConfigured,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshUser,
  };
}
