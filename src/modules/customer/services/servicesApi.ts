import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import {
  ServiceCategory,
  CatalogService,
  ServiceRequestItem,
  ServiceProviderProfile,
  ServiceRequestStatus
} from '../../../types/customer';

// Interfaces for new features
export interface UserAddress {
  id: string;
  profile_id: string;
  title: string;
  city: string;
  street_address: string;
  building_number?: string;
  floor_number?: string;
  apartment_number?: string;
  is_default: boolean;
}

export interface ServiceReview {
  id: string;
  request_id: string;
  customer_id: string;
  provider_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface StatusHistoryItem {
  id: string;
  request_id: string;
  status: ServiceRequestStatus;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
  changer_name?: string;
}

/**
 * Creates an in-app notification in the database for a user
 */
export async function createInAppNotification(
  profileId: string,
  title: string,
  body: string,
  type = 'service',
  payload = {}
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from('notifications').insert({
      profile_id: profileId,
      title,
      body,
      type,
      payload: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

/**
 * Log status transition in service_request_status_history
 */
export async function logStatusHistory(
  requestId: string,
  status: ServiceRequestStatus,
  changedBy: string,
  notes?: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from('service_request_status_history').insert({
      request_id: requestId,
      status,
      changed_by: changedBy,
      notes: notes || null
    });
  } catch (err) {
    console.error('Failed to log status history:', err);
  }
}

/**
 * Fetch status history for a service request
 */
export async function fetchRequestHistory(requestId: string): Promise<StatusHistoryItem[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from('service_request_status_history')
      .select('*, profiles:changed_by(full_name)')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map((h: any) => ({
      id: h.id,
      request_id: h.request_id,
      status: h.status,
      changed_by: h.changed_by,
      notes: h.notes,
      created_at: h.created_at,
      changer_name: h.profiles?.full_name || 'النظام'
    }));
  } catch (err) {
    console.error('Failed to fetch request status history:', err);
    return [];
  }
}

/**
 * Fetch user addresses
 */
export async function fetchUserAddresses(profileId: string): Promise<UserAddress[]> {
  if (!isSupabaseConfigured()) {
    return [
      {
        id: 'addr-default',
        profile_id: profileId,
        title: 'المنزل الرئيسي',
        city: 'كفر الشيخ',
        street_address: 'شارع النصر، أمام مستشفى كفر الشيخ العام',
        is_default: true
      }
    ];
  }
  try {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('profile_id', profileId)
      .order('is_default', { ascending: false });

    if (error) throw error;
    return (data as UserAddress[]) || [];
  } catch (err) {
    console.error('Error fetching user addresses:', err);
    return [];
  }
}

/**
 * Create a new user address
 */
export async function createUserAddress(
  profileId: string,
  title: string,
  streetAddress: string
): Promise<UserAddress> {
  if (!isSupabaseConfigured()) {
    return {
      id: `addr-${Date.now()}`,
      profile_id: profileId,
      title,
      city: 'كفر الشيخ',
      street_address: streetAddress,
      is_default: false
    };
  }
  const { data, error } = await supabase
    .from('addresses')
    .insert({
      profile_id: profileId,
      title,
      city: 'كفر الشيخ',
      street_address: streetAddress,
      is_default: false
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as UserAddress;
}

/**
 * Fetch service reviews for a provider
 */
export async function fetchProviderReviews(providerId: string): Promise<ServiceReview[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from('service_reviews')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as ServiceReview[]) || [];
  } catch (err) {
    console.error('Error fetching provider reviews:', err);
    return [];
  }
}

/**
 * Create a new review for a completed service
 */
export async function createServiceReview(payload: {
  request_id: string;
  customer_id: string;
  provider_id: string;
  rating: number;
  comment: string;
}): Promise<ServiceReview> {
  if (!isSupabaseConfigured()) {
    return {
      id: `rev-${Date.now()}`,
      ...payload,
      created_at: new Date().toISOString()
    };
  }

  // Verify that the request is completed and belongs to the customer
  const { data: request, error: reqError } = await supabase
    .from('service_requests')
    .select('id, status, customer_id')
    .eq('id', payload.request_id)
    .single();

  if (reqError || !request) {
    throw new Error('طلب الخدمة المحدد غير موجود.');
  }

  if (request.customer_id !== payload.customer_id) {
    throw new Error('لا يمكنك تقييم طلب خدمة ليس ملكاً لك.');
  }

  if (request.status !== 'completed') {
    throw new Error('لا يمكن تقييم الخدمة قبل اكتمالها بالكامل.');
  }

  // Validate rating value
  if (payload.rating < 1 || payload.rating > 5) {
    throw new Error('التقييم يجب أن يكون بين 1 و 5 نجوم.');
  }

  // Double check if review already exists
  const { data: existing, error: checkError } = await supabase
    .from('service_reviews')
    .select('id')
    .eq('request_id', payload.request_id)
    .maybeSingle();

  if (checkError) throw checkError;
  if (existing) {
    throw new Error('لقد قمت بتقييم هذه الخدمة بالفعل من قبل.');
  }

  // Insert review
  const { data, error } = await supabase
    .from('service_reviews')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Securely update average rating of the provider
  try {
    const { data: reviews } = await supabase
      .from('service_reviews')
      .select('rating')
      .eq('provider_id', payload.provider_id);

    if (reviews && reviews.length > 0) {
      const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
      const average = parseFloat((sum / reviews.length).toFixed(2));

      await supabase
        .from('service_providers')
        .update({ rating_average: average })
        .eq('id', payload.provider_id);
    }
  } catch (e) {
    console.error('Failed to recalculate provider rating average:', e);
  }

  return data as ServiceReview;
}

/**
 * SECURELY create a service request
 * Checks the true price in database instead of trusting frontend values.
 */
export async function createSecureServiceRequest(payload: {
  customer_id: string;
  service_id: string;
  address_id: string | null;
  scheduled_for?: string;
  notes?: string;
}): Promise<ServiceRequestItem> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase integration is not fully configured.');
  }

  // Fetch the service price securely from the database
  const { data: service, error: srvError } = await supabase
    .from('services')
    .select('base_price_estimate, title_ar')
    .eq('id', payload.service_id)
    .single();

  if (srvError || !service) {
    throw new Error('الخدمة المطلوبة غير متوفرة بقاعدة البيانات.');
  }

  const securedPrice = service.base_price_estimate || 0;

  // Verify that the address belongs to the customer if provided
  if (payload.address_id) {
    const { data: addr, error: addrError } = await supabase
      .from('addresses')
      .select('id')
      .eq('id', payload.address_id)
      .eq('profile_id', payload.customer_id)
      .maybeSingle();

    if (addrError || !addr) {
      throw new Error('العنوان المحدد غير صالح أو لا ينتمي لهذا المستخدم.');
    }
  }

  // Insert the service request
  const { data: newRequest, error: insertError } = await supabase
    .from('service_requests')
    .insert({
      customer_id: payload.customer_id,
      service_id: payload.service_id,
      address_id: payload.address_id || null,
      status: 'pending',
      scheduled_for: payload.scheduled_for || null,
      notes: payload.notes || null,
      agreed_price: securedPrice
    })
    .select('*, service:services(*)')
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  // Log initial history state
  await logStatusHistory(newRequest.id, 'pending', payload.customer_id, 'تم إنشاء طلب الخدمة من قبل العميل.');

  // Notify system admins / relevant providers (simulated via notify table)
  await createInAppNotification(
    payload.customer_id,
    'تأكيد استلام طلبك',
    `تم تسجيل طلب الخدمة "${service.title_ar}" بنجاح وجاري مراجعته من الحرفيين المعتمدين بكفر الشيخ.`
  );

  return newRequest as ServiceRequestItem;
}

/**
 * Cancel a request securely by customer
 */
export async function cancelServiceRequestSecurely(
  requestId: string,
  customerId: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  // Fetch request current status first to ensure legal transition
  const { data: request, error: fetchError } = await supabase
    .from('service_requests')
    .select('status, provider_id, service:services(title_ar)')
    .eq('id', requestId)
    .eq('customer_id', customerId)
    .single();

  if (fetchError || !request) {
    throw new Error('طلب الخدمة غير موجود أو لا تملك صلاحية تعديله.');
  }

  if (request.status !== 'pending' && request.status !== 'accepted') {
    throw new Error('لا يمكن إلغاء الطلب بعد بدء التنفيذ أو اكتماله.');
  }

  const { error: updateError } = await supabase
    .from('service_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('customer_id', customerId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  // Log history
  await logStatusHistory(requestId, 'cancelled', customerId, 'تم إلغاء الطلب من قبل العميل.');

  // Send notifications
  const srvTitle = Array.isArray(request.service) 
    ? (request.service as any)[0]?.title_ar 
    : (request.service as any)?.title_ar;

  await createInAppNotification(
    customerId,
    'تم إلغاء طلب الخدمة',
    `لقد قمت بإلغاء طلب الخدمة "${srvTitle || 'الصيانة'}" بنجاح.`
  );

  if (request.provider_id) {
    // Notify provider if any was assigned
    const { data: provider } = await supabase
      .from('service_providers')
      .select('profile_id')
      .eq('id', request.provider_id)
      .single();

    if (provider) {
      await createInAppNotification(
        provider.profile_id,
        'تم إلغاء الطلب من قبل العميل',
        `الطلب الموجه إليك للحصول على "${srvTitle || 'الصيانة'}" تم إلغاؤه بواسطة العميل.`
      );
    }
  }
}

/**
 * Get or load provider profile for a user
 */
export async function fetchProviderProfileByUserId(userId: string): Promise<ServiceProviderProfile | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('service_providers')
      .select('*, profiles:profile_id(full_name, phone_number, avatar_url)')
      .eq('profile_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Get categories as well
    const { data: cats } = await supabase
      .from('service_provider_categories')
      .select('category_id')
      .eq('provider_id', data.id);

    const categoryIds = cats ? cats.map((c: any) => c.category_id) : [];

    return {
      id: data.id,
      profile_id: data.profile_id,
      bio: data.bio,
      verification_status: data.verification_status,
      rating_average: Number(data.rating_average || 0),
      jobs_completed_count: data.jobs_completed_count || 0,
      profile: {
        full_name: data.profiles?.full_name || '',
        phone_number: data.profiles?.phone_number || '',
        avatar_url: data.profiles?.avatar_url || ''
      },
      categoryIds // Dynamically appended
    } as any;
  } catch (err) {
    console.error('Error in fetchProviderProfileByUserId:', err);
    return null;
  }
}

/**
 * Register a user as a Service Provider
 */
export async function registerProviderProfile(
  userId: string,
  bio: string,
  categoryIds: string[]
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  // 1. Create service_providers record (triggers pending by default)
  const { data: provider, error: providerError } = await supabase
    .from('service_providers')
    .insert({
      profile_id: userId,
      bio,
      verification_status: 'pending'
    })
    .select()
    .single();

  if (providerError) {
    throw new Error(`فشل تسجيل الملف الحرفي: ${providerError.message}`);
  }

  // 2. Link categories
  if (categoryIds.length > 0) {
    const junctionRows = categoryIds.map((catId) => ({
      provider_id: provider.id,
      category_id: catId
    }));

    const { error: catError } = await supabase
      .from('service_provider_categories')
      .insert(junctionRows);

    if (catError) {
      console.error('Failed to link provider categories:', catError);
    }
  }

  // 3. Request user_roles update (assign role 'provider' or update)
  try {
    const { data: roleData } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'provider')
      .single();

    if (roleData) {
      await supabase.from('user_roles').insert({
        profile_id: userId,
        role_id: roleData.id
      });
    }
  } catch (roleErr) {
    console.warn('Failed to auto-assign provider role via database. Admin can do this manually.', roleErr);
  }

  // 4. Create welcome notification
  await createInAppNotification(
    userId,
    'طلب تسجيل الحساب الحرفي',
    'تم تقديم طلبك بنجاح كمزود خدمة/حرفي موثق بكفر الشيخ. الطلب حالياً قيد المراجعة الأمنية والمهنية.'
  );
}

/**
 * Fetch available requests for an approved provider (matching their category specializations)
 */
export async function fetchProviderAvailableRequests(categoryIds: string[]): Promise<ServiceRequestItem[]> {
  if (!isSupabaseConfigured() || categoryIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from('service_requests')
      .select('*, service:services(*), customer:customer_id(full_name, phone_number)')
      .eq('status', 'pending')
      .is('provider_id', null)
      .in('service_id', (
        await supabase
          .from('services')
          .select('id')
          .in('category_id', categoryIds)
      ).data?.map((s: any) => s.id) || []);

    if (error) throw error;
    return (data as ServiceRequestItem[]) || [];
  } catch (err) {
    console.error('Error fetching available requests for provider:', err);
    return [];
  }
}

/**
 * Fetch requests related to a specific provider
 */
export async function fetchProviderRequests(providerId: string): Promise<ServiceRequestItem[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from('service_requests')
      .select('*, service:services(*), customer:customer_id(full_name, phone_number)')
      .eq('provider_id', providerId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data as ServiceRequestItem[]) || [];
  } catch (err) {
    console.error('Error fetching provider requests:', err);
    return [];
  }
}

/**
 * Securely transition status of a service request by a provider
 */
export async function transitionRequestStatus(
  requestId: string,
  providerId: string,
  userId: string,
  currentStatus: ServiceRequestStatus,
  newStatus: ServiceRequestStatus,
  notes?: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  // State Machine Transitions Legality Check
  const allowedTransitions: Record<ServiceRequestStatus, ServiceRequestStatus[]> = {
    draft: ['pending'],
    pending: ['accepted', 'cancelled'],
    accepted: ['in_progress', 'cancelled'],
    in_progress: ['completed'],
    completed: [],
    cancelled: []
  };

  if (!allowedTransitions[currentStatus] || !allowedTransitions[currentStatus].includes(newStatus)) {
    throw new Error(`انتقال غير مسموح به من حالة ${currentStatus} إلى حالة ${newStatus}`);
  }

  // Update query payload
  const updatePayload: any = {
    status: newStatus,
    updated_at: new Date().toISOString()
  };

  // If accepting a request, bind the provider_id
  if (currentStatus === 'pending' && newStatus === 'accepted') {
    updatePayload.provider_id = providerId;
  }

  // Perform secure update
  let query = supabase
    .from('service_requests')
    .update(updatePayload)
    .eq('id', requestId);

  // If already accepted or in progress, ensure it belongs to this provider
  if (currentStatus !== 'pending') {
    query = query.eq('provider_id', providerId);
  }

  const { data: updatedRows, error: updateError } = await query.select('id');

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (!updatedRows || updatedRows.length === 0) {
    throw new Error('فشلت عملية التحديث: الطلب غير موجود أو أنك غير مصرح لك بتعديله.');
  }

  // Get customer id to notify them
  const { data: requestDetail } = await supabase
    .from('service_requests')
    .select('customer_id, service:services(title_ar)')
    .eq('id', requestId)
    .single();

  const customerId = requestDetail?.customer_id;
  const detailSrvTitle = Array.isArray(requestDetail?.service)
    ? (requestDetail?.service as any)[0]?.title_ar
    : (requestDetail?.service as any)?.title_ar;
  const serviceTitle = detailSrvTitle || 'الخدمة المطلوبة';

  // Log history
  const statusLabels: Record<ServiceRequestStatus, string> = {
    draft: 'مسودة',
    pending: 'قيد المراجعة',
    accepted: 'تم قبول الطلب',
    in_progress: 'بدء تنفيذ الخدمة',
    completed: 'اكتملت الخدمة بنجاح',
    cancelled: 'تم إلغاء الطلب'
  };

  await logStatusHistory(requestId, newStatus, userId, notes || statusLabels[newStatus] || 'تحديث الحالة');

  // Handle Notifications
  if (customerId) {
    if (newStatus === 'accepted') {
      await createInAppNotification(
        customerId,
        'تم قبول طلب الخدمة',
        `لقد تم قبول طلبك لـ "${serviceTitle}" من الفني/الحرفي وجاري تأكيد الموعد للتنفيذ.`
      );
    } else if (newStatus === 'in_progress') {
      await createInAppNotification(
        customerId,
        'بدء تنفيذ الخدمة',
        `بدأ الفني في تنفيذ خدمات الصيانة لطلبك: "${serviceTitle}" الآن.`
      );
    } else if (newStatus === 'completed') {
      await createInAppNotification(
        customerId,
        'اكتملت الخدمة! يرجى التقييم',
        `تم الانتهاء من تنفيذ طلب الخدمة "${serviceTitle}" بنجاح. يرجى مراجعة وتقييم الفني في لوحة التحكم.`
      );

      // Increment completed jobs count secure update
      try {
        const { data: providerData } = await supabase
          .from('service_providers')
          .select('jobs_completed_count')
          .eq('id', providerId)
          .single();

        const currentCount = providerData?.jobs_completed_count || 0;
        await supabase
          .from('service_providers')
          .update({ jobs_completed_count: currentCount + 1 })
          .eq('id', providerId);
      } catch (countErr) {
        console.error('Failed to increment completed jobs count:', countErr);
      }
    } else if (newStatus === 'cancelled') {
      await createInAppNotification(
        customerId,
        'تم إلغاء الخدمة من مقدمها',
        `نعتذر لك، تم إلغاء طلب الخدمة "${serviceTitle}" من قبل الحرفي/الفني.`
      );
    }
  }
}
