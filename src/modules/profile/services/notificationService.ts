import { supabase } from '../../../lib/supabase';
import { NotificationPreferences } from '../../../types/auth';

export const notificationService = {
  /**
   * Fetch notification preferences for a given user profile ID.
   * Auto-creates default preferences if none exist.
   */
  async getPreferences(profileId: string): Promise<NotificationPreferences> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching notification preferences:', error);
      throw new Error('تعذر جلب تفضيلات الإشعارات، يرجى المحاولة لاحقاً.');
    }

    if (data) {
      return {
        profile_id: data.profile_id,
        push_enabled: data.push_enabled ?? true,
        sms_enabled: data.sms_enabled ?? true,
        promotional_enabled: data.promotional_enabled ?? false,
        updated_at: data.updated_at,
      };
    }

    // Default record creation if missing
    const defaultPrefs: NotificationPreferences = {
      profile_id: profileId,
      push_enabled: true,
      sms_enabled: true,
      promotional_enabled: false,
    };

    const { data: insertedData, error: insertError } = await supabase
      .from('notification_preferences')
      .upsert({
        profile_id: profileId,
        push_enabled: true,
        sms_enabled: true,
        promotional_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.warn('Upsert fallback warning:', insertError);
      return defaultPrefs;
    }

    return {
      profile_id: insertedData.profile_id,
      push_enabled: insertedData.push_enabled ?? true,
      sms_enabled: insertedData.sms_enabled ?? true,
      promotional_enabled: insertedData.promotional_enabled ?? false,
      updated_at: insertedData.updated_at,
    };
  },

  /**
   * Update notification preferences for the logged-in user profile.
   */
  async updatePreferences(
    profileId: string,
    updates: Partial<Omit<NotificationPreferences, 'profile_id'>>
  ): Promise<NotificationPreferences> {
    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('notification_preferences')
      .update(payload)
      .eq('profile_id', profileId)
      .select()
      .single();

    if (error) {
      console.error('Error updating notification preferences:', error);
      throw new Error('حدث خطأ أثناء حفظ تفضيلات الإشعارات.');
    }

    if (!data) {
      throw new Error('لم يتم العثور على سجل التفضيلات للتحديث.');
    }

    return {
      profile_id: data.profile_id,
      push_enabled: data.push_enabled,
      sms_enabled: data.sms_enabled,
      promotional_enabled: data.promotional_enabled,
      updated_at: data.updated_at,
    };
  },
};
