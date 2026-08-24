import { supabase } from '../../../lib/supabase';
import { AppRole, VerificationStatus } from '../../../types/auth';

export interface AdminStats {
  totalUsers: number;
  totalProviders: number;
  totalDrivers: number;
  totalMerchants: number;
  totalEmployers: number;
  totalProducts: number;
  totalOrders: number;
  totalRides: number;
  totalServiceRequests: number;
}

export interface AdminMerchant {
  id: string;
  profile_id: string;
  store_name: string;
  store_logo_url: string | null;
  bio: string | null;
  approval_status: VerificationStatus;
  rating_average: number;
  created_at: string;
  owner_name: string;
  owner_phone: string | null;
}

export interface AdminProvider {
  id: string;
  profile_id: string;
  bio: string | null;
  verification_status: VerificationStatus;
  rating_average: number;
  jobs_completed_count: number;
  created_at: string;
  provider_name: string;
  provider_phone: string | null;
}

export interface AdminDriver {
  id: string;
  profile_id: string;
  national_id: string;
  license_number: string;
  approval_status: VerificationStatus;
  is_online: boolean;
  rating_average: number;
  created_at: string;
  updated_at?: string;
  driver_name: string;
  driver_phone: string | null;
  driver_avatar?: string | null;
}

export interface AdminAuditLog {
  id: string;
  actor_id: string | null;
  actor_name: string;
  action: string;
  target_entity: string;
  target_id: string | null;
  old_value: any;
  new_value: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AdminOrder {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string | null;
  store_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface AdminServiceRequest {
  id: string;
  customer_name: string;
  provider_name: string | null;
  service_title: string;
  status: string;
  agreed_price: number | null;
  created_at: string;
}

export const adminApi = {
  /**
   * Get administrative statistics across all database tables
   */
  async getAdminStats(): Promise<AdminStats> {
    const tables = [
      { name: 'profiles', key: 'totalUsers' },
      { name: 'service_providers', key: 'totalProviders' },
      { name: 'drivers', key: 'totalDrivers' },
      { name: 'merchants', key: 'totalMerchants' },
      { name: 'employers', key: 'totalEmployers' },
      { name: 'products', key: 'totalProducts' },
      { name: 'orders', key: 'totalOrders' },
      { name: 'rides', key: 'totalRides' },
      { name: 'service_requests', key: 'totalServiceRequests' },
    ];

    const counts: Record<string, number> = {};

    await Promise.all(
      tables.map(async (table) => {
        const { count, error } = await supabase
          .from(table.name)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.error(`Error fetching count for table ${table.name}:`, error);
          counts[table.key] = 0;
        } else {
          counts[table.key] = count || 0;
        }
      })
    );

    return counts as unknown as AdminStats;
  },

  /**
   * Fetch all registered merchants along with owner profile info
   */
  async getMerchants(): Promise<AdminMerchant[]> {
    const { data, error } = await supabase
      .from('merchants')
      .select(`
        *,
        profiles (
          full_name,
          phone_number
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching merchants for admin:', error);
      throw new Error('حدث خطأ أثناء جلب قائمة التجار.');
    }

    return (data || []).map((m: any) => ({
      id: m.id,
      profile_id: m.profile_id,
      store_name: m.store_name,
      store_logo_url: m.store_logo_url,
      bio: m.bio,
      approval_status: m.approval_status as VerificationStatus,
      rating_average: Number(m.rating_average || 0),
      created_at: m.created_at,
      owner_name: m.profiles?.full_name || 'غير معروف',
      owner_phone: m.profiles?.phone_number || null,
    }));
  },

  /**
   * Update approval status of a merchant (trigger automatically creates audit log)
   */
  async updateMerchantStatus(merchantId: string, status: VerificationStatus): Promise<void> {
    const { data: merchantData, error: fetchErr } = await supabase
      .from('merchants')
      .select('profile_id')
      .eq('id', merchantId)
      .single();

    if (fetchErr) {
      console.error('[ADMIN] Error fetching merchant profile:', fetchErr);
      throw new Error(`تعذر جلب ملف التاجر: ${fetchErr.message}`);
    }
    const profileId = merchantData.profile_id;

    const { data, error } = await supabase
      .from('merchants')
      .update({ approval_status: status, updated_at: new Date().toISOString() })
      .eq('id', merchantId)
      .select();

    if (error) {
      console.error('[ADMIN] Error updating merchant status:', error);
      throw new Error(`تعذر تحديث حالة التاجر: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('لم يتم تحديث السجل. تأكد من أن حسابك يمتلك صلاحيات المشرف (Admin) وأن السجل موجود.');
    }

    // Role synchronization for merchant
    try {
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'merchant')
        .single();

      if (roleData) {
        if (status === 'approved') {
          await supabase
            .from('user_roles')
            .upsert({ profile_id: profileId, role_id: roleData.id }, { onConflict: 'profile_id,role_id' });
        } else if (status === 'suspended' || status === 'rejected') {
          await supabase
            .from('user_roles')
            .delete()
            .eq('profile_id', profileId)
            .eq('role_id', roleData.id);
        }
      }
    } catch (roleErr) {
      console.error('[ADMIN] Error synchronizing merchant role:', roleErr);
    }
  },

  /**
   * Fetch all registered service providers/craftsmen with profile details
   */
  async getProviders(): Promise<AdminProvider[]> {
    const { data, error } = await supabase
      .from('service_providers')
      .select(`
        *,
        profiles (
          full_name,
          phone_number
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching service providers for admin:', error);
      throw new Error('حدث خطأ أثناء جلب مقدمي الخدمات.');
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      profile_id: p.profile_id,
      bio: p.bio,
      verification_status: p.verification_status as VerificationStatus,
      rating_average: Number(p.rating_average || 0),
      jobs_completed_count: p.jobs_completed_count || 0,
      created_at: p.created_at,
      provider_name: p.profiles?.full_name || 'غير معروف',
      provider_phone: p.profiles?.phone_number || null,
    }));
  },

  /**
   * Update verification status of a service provider (trigger logs this)
   */
  async updateProviderStatus(providerId: string, status: VerificationStatus): Promise<void> {
    const { data: providerData, error: fetchErr } = await supabase
      .from('service_providers')
      .select('profile_id')
      .eq('id', providerId)
      .single();

    if (fetchErr) {
      console.error('[ADMIN] Error fetching provider profile:', fetchErr);
      throw new Error(`تعذر جلب ملف مقدم الخدمة: ${fetchErr.message}`);
    }
    const profileId = providerData.profile_id;

    const { data, error } = await supabase
      .from('service_providers')
      .update({ verification_status: status, updated_at: new Date().toISOString() })
      .eq('id', providerId)
      .select();

    if (error) {
      console.error('[ADMIN] Error updating provider status:', error);
      throw new Error(`تعذر تحديث حالة مقدم الخدمة: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('لم يتم تحديث السجل. تأكد من أن حسابك يمتلك صلاحيات المشرف (Admin) وأن السجل موجود.');
    }

    // Role synchronization for provider
    try {
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'provider')
        .single();

      if (roleData) {
        if (status === 'approved') {
          await supabase
            .from('user_roles')
            .upsert({ profile_id: profileId, role_id: roleData.id }, { onConflict: 'profile_id,role_id' });
        } else if (status === 'suspended' || status === 'rejected') {
          await supabase
            .from('user_roles')
            .delete()
            .eq('profile_id', profileId)
            .eq('role_id', roleData.id);
        }
      }
    } catch (roleErr) {
      console.error('[ADMIN] Error synchronizing provider role:', roleErr);
    }
  },

  /**
   * Fetch all registered drivers with their profile info
   */
  async getDrivers(): Promise<AdminDriver[]> {
    const { data, error } = await supabase
      .from('drivers')
      .select(`
        *,
        profiles!drivers_profile_id_fkey (
          id,
          full_name,
          phone_number,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ADMIN] Error fetching drivers:', error);
      if (error.code === '42501' || error.message.includes('RLS')) {
        throw new Error('خطأ في صلاحيات الوصول');
      }
      throw new Error(`حدث خطأ أثناء جلب قائمة السائقين: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log('لا توجد سجلات');
      return [];
    }

    return data.map((d: any) => ({
      id: d.id,
      profile_id: d.profile_id,
      national_id: d.national_id,
      license_number: d.license_number,
      approval_status: d.approval_status as VerificationStatus,
      is_online: d.is_online,
      rating_average: Number(d.rating_average || 0),
      created_at: d.created_at,
      updated_at: d.updated_at,
      driver_name: d.profiles?.full_name || 'غير معروف',
      driver_phone: d.profiles?.phone_number || null,
      driver_avatar: d.profiles?.avatar_url || null,
    }));
  },

  /**
   * Update approval status of a driver (trigger logs this)
   */
    async updateDriverStatus(driverId: string, status: VerificationStatus): Promise<void> {
    // 1. Check if user is logged in
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('يجب تسجيل الدخول أولًا.');
    }

    console.log('[ADMIN DRIVER APPROVAL]');
    console.log('adminUserId:', user.id);
    console.log('driverId:', driverId);
    console.log('newStatus:', status);

    const { data, error } = await supabase.rpc('admin_approve_driver', {
      p_driver_id: driverId,
      p_status: status
    });

    if (error) {
      console.error('[ADMIN] RPC admin_approve_driver failed:', error);
      throw new Error(`تعذر تحديث حالة السائق: ${error.message}`);
    }

    if (data?.success !== true) {
      console.error('[ADMIN] admin_approve_driver returned failure:', data);
      throw new Error('لم تكتمل عملية الاعتماد بنجاح.');
    }
    
    console.log('Driver status updated successfully:', data);
  },

  /**
   * Fetch all audit logs for operational actions (Admin only)
   */
  async getAuditLogs(): Promise<AdminAuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        profiles (
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching audit logs:', error);
      throw new Error('حدث خطأ أثناء جلب سجل العمليات.');
    }

    return (data || []).map((log: any) => ({
      id: log.id,
      actor_id: log.actor_id,
      actor_name: log.profiles?.full_name || 'النظام / تلقائي',
      action: log.action,
      target_entity: log.target_entity,
      target_id: log.target_id,
      old_value: log.old_value,
      new_value: log.new_value,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      created_at: log.created_at,
    }));
  },

  /**
   * Fetch recent orders for administrative tracking
   */
  async getOrders(): Promise<AdminOrder[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        customer_id,
        total_amount,
        status,
        created_at,
        profiles (
          full_name,
          phone_number
        ),
        merchants (
          store_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching orders for admin:', error);
      throw new Error('حدث خطأ أثناء جلب قائمة الطلبات.');
    }

    return (data || []).map((o: any) => ({
      id: o.id,
      customer_id: o.customer_id,
      customer_name: o.profiles?.full_name || 'غير معروف',
      customer_phone: o.profiles?.phone_number || null,
      store_name: o.merchants?.store_name || 'غير معروف',
      total_amount: Number(o.total_amount || 0),
      status: o.status,
      created_at: o.created_at,
    }));
  },

  /**
   * Fetch service requests for administration tracking
   */
  async getServiceRequests(): Promise<AdminServiceRequest[]> {
    const { data, error } = await supabase
      .from('service_requests')
      .select(`
        id,
        status,
        agreed_price,
        created_at,
        customer:customer_id (full_name),
        provider:provider_id (profiles (full_name)),
        services (title_ar)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching service requests for admin:', error);
      throw new Error('حدث خطأ أثناء جلب طلبات الخدمات.');
    }

    return (data || []).map((sr: any) => ({
      id: sr.id,
      customer_name: sr.customer?.full_name || 'غير معروف',
      provider_name: sr.provider?.profiles?.full_name || 'لم يحدد بعد',
      service_title: sr.services?.title_ar || 'خدمة عامة',
      status: sr.status,
      agreed_price: sr.agreed_price ? Number(sr.agreed_price) : null,
      created_at: sr.created_at,
    }));
  },
};
