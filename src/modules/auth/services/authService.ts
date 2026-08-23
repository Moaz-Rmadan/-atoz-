import { supabase } from '../../../lib/supabase';
import { UserProfile, AppRole, AppPermission, SignUpPayload, SignInPayload } from '../../../types/auth';

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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(this.translateAuthError(error.message));
    }

    return data;
  },

  /**
   * Sign out current user
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(this.translateAuthError(error.message));
    }
  },

  /**
   * Send password reset email
   */
  async resetPasswordForEmail(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw new Error(this.translateAuthError(error.message));
    }
  },

  /**
   * Update current user's password (after recovery flow)
   */
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(this.translateAuthError(error.message));
    }
  },

  /**
   * Fetch complete UserProfile with assigned roles and permissions
   */
  async fetchUserProfile(userId: string): Promise<UserProfile | null> {
    // 1. Fetch Profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      console.warn('Profile not found or error:', profileError);
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
  },

  /**
   * Update profile information
   */
  async updateProfile(userId: string, updates: Partial<UserProfile>) {
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
  },

  /**
   * Arabic Translation Helper for common Supabase Auth errors
   */
  translateAuthError(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('invalid login credentials')) {
      return 'بيانات الدخول غير صحيحة، يرجى التأكد من البريد وكلمة المرور';
    }
    if (lower.includes('user already registered') || lower.includes('email rate limit exceeded')) {
      return 'هذا البريد الإلكتروني مسجل بالفعل أو تم تجاوز حد الطلبات، حاول تسجيل الدخول';
    }
    if (lower.includes('password should be at least')) {
      return 'كلمة المرور يجب أن لا تقل عن 6 أحرف';
    }
    if (lower.includes('invalid email')) {
      return 'البريد الإلكتروني المدخل غير صالح';
    }
    return message;
  },
};
