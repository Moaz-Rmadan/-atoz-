import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, AppRole, AppPermission, SignUpPayload, SignInPayload } from '../types/auth';
import { authService } from '../modules/auth/services/authService';

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  isConfigured: boolean;
  roles: AppRole[];
  permissions: AppPermission[];
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (rolesList: AppRole[]) => boolean;
  hasPermission: (permission: AppPermission) => boolean;
  hasAnyPermission: (permissionsList: AppPermission[]) => boolean;
  isAdmin: () => boolean;
  signUp: (payload: SignUpPayload) => Promise<void>;
  signIn: (payload: SignInPayload) => Promise<void>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured] = useState<boolean>(isSupabaseConfigured());

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const profile = await authService.fetchUserProfile(userId);
      setUser(profile);
    } catch (err: any) {
      console.error('Failed to load user profile:', err);
      setUser(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  }, [session, fetchProfile]);

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      setIsLoading(true);
      try {
        if (!isConfigured) {
          setIsLoading(false);
          return;
        }

        // Get initial session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error fetching session:', sessionError);
        }

        if (isMounted) {
          setSession(currentSession);
          if (currentSession?.user) {
            await fetchProfile(currentSession.user.id);
          } else {
            setUser(null);
          }
        }
      } catch (err: any) {
        console.error('Auth initialization failed:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    // Set up auth change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;

        setSession(newSession);

        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setUser(null);
        }

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isConfigured, fetchProfile]);

  const signUp = async (payload: SignUpPayload) => {
    setError(null);
    setIsLoading(true);
    try {
      await authService.signUp(payload);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إنشاء الحساب');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (payload: SignInPayload) => {
    setError(null);
    setIsLoading(true);
    try {
      await authService.signIn(payload);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      setSession(null);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الخروج');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await authService.resetPasswordForEmail(email);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إرسال رابط استعادة كلمة المرور');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await authService.updatePassword(password);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحديث كلمة المرور');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  // RBAC Helper Methods
  const roles: AppRole[] = user?.roles || [];
  const permissions: AppPermission[] = user?.permissions || [];

  const isAdmin = useCallback((): boolean => {
    if (!user) return false;
    return (user.roles || []).includes('admin') || (user.permissions || []).includes('admin:all');
  }, [user]);

  const hasRole = useCallback((role: AppRole): boolean => {
    if (!user) return false;
    if (isAdmin()) return true;
    return (user.roles || []).includes(role);
  }, [user, isAdmin]);

  const hasAnyRole = useCallback((rolesList: AppRole[]): boolean => {
    if (!user) return false;
    if (rolesList.length === 0) return true;
    if (isAdmin()) return true;
    const userRoles = user.roles || [];
    return rolesList.some((r) => userRoles.includes(r));
  }, [user, isAdmin]);

  const hasPermission = useCallback((permission: AppPermission): boolean => {
    if (!user) return false;
    if (isAdmin()) return true;
    const userPerms = user.permissions || [];
    return userPerms.includes('admin:all') || userPerms.includes(permission);
  }, [user, isAdmin]);

  const hasAnyPermission = useCallback((permissionsList: AppPermission[]): boolean => {
    if (!user) return false;
    if (permissionsList.length === 0) return true;
    if (isAdmin()) return true;
    const userPerms = user.permissions || [];
    if (userPerms.includes('admin:all')) return true;
    return permissionsList.some((p) => userPerms.includes(p));
  }, [user, isAdmin]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!session && !!user,
        error,
        isConfigured,
        roles,
        permissions,
        hasRole,
        hasAnyRole,
        hasPermission,
        hasAnyPermission,
        isAdmin,
        signUp,
        signIn,
        signOut,
        forgotPassword,
        resetPassword,
        refreshProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
