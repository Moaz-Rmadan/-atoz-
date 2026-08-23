import { supabase } from '../../../lib/supabase';
import { UserProfile, AppRole, AppPermission, SignUpPayload, SignInPayload } from '../../../types/auth';

const isDev = (): boolean => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return !!import.meta.env.DEV;
    }
  } catch {
    // Ignore
  }
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.NODE_ENV === 'development';
    }
  } catch {
    // Ignore
  }
  return false;
};

export const authService = {
  /**
   * Sign up a new user with email and password.
   * Trigger in Database automatically creates profile in public.profiles and default 'customer' role.
   */
  async signUp({ email, password, fullName, phoneNumber, role = 'customer' }: SignUpPayload) {
    if (!password) {
      throw new Error('كلمة المرور مطلوبة لإنشاء الحساب');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone_number: phoneNumber,
        },
      },
    });

    if (error) {
      throw new Error(this.translateAuthError(error.message));
    }

    if (data.user) {
      // If a specific non-customer role was selected (e.g. driver, merchant, provider, employer), assign it
      if (role && role !== 'customer') {
        const { data: roleRecord } = await supabase
          .from('roles')
          .select('id')
          .eq('name', role)
          .single();

        if (roleRecord) {
          await supabase.from('user_roles').insert({
            profile_id: data.user.id,
            role_id: roleRecord.id,
          });
        }
      }
    }

    return data;
  },

  /**
   * Sign in user with email & password
   */
  async signIn({ email, password }: SignInPayload) {
    if (!password) {
      throw new Error('كلمة المرور مطلوبة');
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (isDev()) {
          console.error('[Supabase Auth SignIn Error Details]:', {
            message: error.message,
            status: error.status,
            name: error.name,
            code: (error as any).code,
          });
        }
        throw new Error(this.translateAuthError(error.message));
      }

      return data;
    } catch (err: any) {
      if (isDev()) {
        console.error('[AuthService.signIn Network/Unexpected Exception]:', err);
      }
      throw new Error(this.translateAuthError(err.message || 'حدث خطأ أثناء الاتصال بالخادم'));
    }
  },

  /**
   * Sign out current user
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new Error(this.translateAuthError(error.message));
      }
    } catch (err: any) {
      if (isDev()) {
        console.error('[AuthService.signOut Exception]:', err);
      }
      throw new Error(this.translateAuthError(err.message || 'حدث خطأ أثناء تسجيل الخروج'));
    }
  },

  /**
   * Send password reset email
   */
  async resetPasswordForEmail(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw new Error(this.translateAuthError(error.message));
      }
    } catch (err: any) {
      if (isDev()) {
        console.error('[AuthService.resetPasswordForEmail Exception]:', err);
      }
      throw new Error(this.translateAuthError(err.message || 'فشل إرسال رابط استعادة كلمة المرور'));
    }
  },

  /**
   * Update current user's password (after recovery flow)
   */
  async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw new Error(this.translateAuthError(error.message));
      }
    } catch (err: any) {
      if (isDev()) {
        console.error('[AuthService.updatePassword Exception]:', err);
      }
      throw new Error(this.translateAuthError(err.message || 'فشل تحديث كلمة المرور'));
    }
  },

  /**
   * Fetch complete UserProfile with assigned roles and permissions
   */
  async fetchUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // 1. Fetch Profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError || !profile) {
        if (isDev()) {
          console.warn('[fetchUserProfile] Profile query warning/not found:', profileError);
        }
        return null;
      }

      // 2. Fetch User Roles
      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('roles(name)')
        .eq('profile_id', userId);

      const roles: AppRole[] = [];
      if (!rolesError && userRolesData) {
        userRolesData.forEach((ur: any) => {
          if (ur.roles?.name) {
            roles.push(ur.roles.name as AppRole);
          }
        });
      }

      // Fallback to customer role if none found
      if (roles.length === 0) {
        roles.push('customer');
      }

      // 3. Fetch Permissions associated with roles
      const { data: permissionsData } = await supabase
        .from('user_roles')
        .select('role_id, role_permissions(permissions(code))')
        .eq('profile_id', userId);

      const permissionsSet = new Set<AppPermission>();
      if (permissionsData) {
        permissionsData.forEach((ur: any) => {
          if (ur.role_permissions && Array.isArray(ur.role_permissions)) {
            ur.role_permissions.forEach((rp: any) => {
              if (rp.permissions?.code) {
                permissionsSet.add(rp.permissions.code as AppPermission);
              }
            });
          }
        });
      }

      return {
        id: profile.id,
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        is_active: profile.is_active,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        deleted_at: profile.deleted_at,
        roles,
        permissions: Array.from(permissionsSet),
      };
    } catch (err: any) {
      if (isDev()) {
        console.error('[fetchUserProfile Unexpected Error]:', err);
      }
      return null;
    }
  },

  /**
   * Update profile information
   */
  async updateProfile(userId: string, updates: Partial<UserProfile>) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: updates.full_name,
          phone_number: updates.phone_number,
          bio: updates.bio,
          avatar_url: updates.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(this.translateAuthError(error.message));
      }

      return data;
    } catch (err: any) {
      if (isDev()) {
        console.error('[updateProfile Error]:', err);
      }
      throw new Error(this.translateAuthError(err.message || 'فشل تحديث البيانات'));
    }
  },

  /**
   * Arabic Translation Helper for common Supabase Auth errors
   */
  translateAuthError(message: string): string {
    const lower = (message || '').toLowerCase();
    
    // Network & Fetch Failures
    if (
      lower.includes('failed to fetch') ||
      lower.includes('networkerror') ||
      lower.includes('network request failed') ||
      lower.includes('fetch failed') ||
      lower.includes('load failed')
    ) {
      return 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت وحالة الشبكة.';
    }

    // Invalid Credentials
    if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
      return 'بيانات الدخول غير صحيحة، يرجى التأكد من البريد وكلمة المرور';
    }

    // Email verification required
    if (lower.includes('email not confirmed')) {
      return 'يرجى تأكيد البريد الإلكتروني أولاً قبل تسجيل الدخول';
    }

    // Rate Limiting & Limits
    if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('over_email_send_rate_limit')) {
      return 'تم تجاوز حد الطلبات المسموح به، يرجى الانتظار دقيقة ثم إعادة المحاولة';
    }

    // Duplicate Registration
    if (lower.includes('user already registered') || lower.includes('already registered')) {
      return 'هذا البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول بدلاً من ذلك';
    }

    // Password validations
    if (lower.includes('password should be at least') || lower.includes('weak_password')) {
      return 'كلمة المرور يجب أن لا تقل عن 6 أحرف';
    }

    // Invalid Email format
    if (lower.includes('invalid email') || lower.includes('unable to validate email address')) {
      return 'البريد الإلكتروني المدخل غير صالح';
    }

    return message;
  },
};
