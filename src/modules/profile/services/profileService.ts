import { supabase } from '../../../lib/supabase';
import { UserProfile } from '../../../types/auth';

export interface UpdateProfilePayload {
  full_name?: string;
  phone_number?: string;
  bio?: string;
  avatar_url?: string;
}

export const profileService = {
  /**
   * Fetch complete profile by user ID
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`خطأ أثناء جلب بيانات الملف الشخصي: ${error.message}`);
    }

    if (!profile) return null;

    // Fetch user roles
    const { data: userRolesData } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('profile_id', userId);

    const roles = userRolesData ? userRolesData.map((ur: any) => ur.roles?.name).filter(Boolean) : ['customer'];

    return {
      ...profile,
      roles,
      permissions: [],
    };
  },

  /**
   * Update profile information
   */
  async updateProfile(userId: string, payload: UpdateProfilePayload): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`فشل تحديث البيانات الشخصية: ${error.message}`);
    }

    return data;
  },

  /**
   * Upload avatar image to 'avatars' bucket
   */
  async uploadAvatar(userId: string, file: File): Promise<string> {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      throw new Error('نوع الملف غير مدعوم. يرجى اختيار صورة بصيغة JPG, PNG, WEBP, أو GIF.');
    }

    // Validate file size (max 5MB)
    const maxSizeInBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      throw new Error('حجم الصورة كبير جداً. الحد الأقصى المسموح به هو 5 ميجابايت.');
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage 'avatars' bucket
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`خطأ أثناء رفع الصورة: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  },
};
