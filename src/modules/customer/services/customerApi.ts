import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import {
  ServiceCategory,
  CatalogService,
  ServiceDiscoveryFilter,
  ServiceRequestItem,
  CustomerRideItem,
  CustomerOrderItem,
  CustomerJobApplicationItem,
} from '../../../types/customer';

// Fallback seed categories if database query yields empty or table doesn't exist yet
const FALLBACK_CATEGORIES: ServiceCategory[] = [
  {
    id: 'cat-1',
    name_ar: 'صيانة منزلية وسباكة',
    description_ar: 'خدمات السباكة والكهرباء والتكييف والتركيبات المنزلية بكفر الشيخ',
    icon_url: 'wrench',
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'cat-2',
    name_ar: 'أجهزة كهربائية وإلكترونيات',
    description_ar: 'تصليح الثلاجات، الغسالات، الشاشات والأجهزة الكهربائية',
    icon_url: 'tv',
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'cat-3',
    name_ar: 'نقاشة وتشطيبات',
    description_ar: 'أعمال الدهانات والجبس بورد والتشطيبات المتكاملة',
    icon_url: 'paint-bucket',
    is_active: true,
    sort_order: 3,
  },
  {
    id: 'cat-4',
    name_ar: 'تنظيف ومكافحة حشرات',
    description_ar: 'تنظيف المنازل والسجاد والمفروشات ومكافحة الآفات',
    icon_url: 'sparkles',
    is_active: true,
    sort_order: 4,
  },
  {
    id: 'cat-5',
    name_ar: 'سيارات وميكانيكا',
    description_ar: 'صيانة وميكانيكا السيارات ورعاية الطريق بكفر الشيخ',
    icon_url: 'car',
    is_active: true,
    sort_order: 5,
  },
  {
    id: 'cat-6',
    name_ar: 'تعليم واستشارات',
    description_ar: 'دروس خصوصية واستشارات هندسية وقانونية ومالية',
    icon_url: 'book-open',
    is_active: true,
    sort_order: 6,
  },
];

const FALLBACK_SERVICES: CatalogService[] = [
  {
    id: 'srv-1',
    category_id: 'cat-1',
    title_ar: 'تصليح وتسريب سباكة متكامل',
    description_ar: 'كشف وتسريب الخلاطات والمواسير بقطع غيار أصلية وضمان العمل.',
    base_price_estimate: 150,
    is_active: true,
    category: FALLBACK_CATEGORIES[0],
  },
  {
    id: 'srv-2',
    category_id: 'cat-1',
    title_ar: 'تأسيس وصيانة شبكات كهرباء',
    description_ar: 'تركيب مفاتيح الكهرباء وتغيير الأسلاك والفحص الشامل للوحة التوزيع.',
    base_price_estimate: 200,
    is_active: true,
    category: FALLBACK_CATEGORIES[0],
  },
  {
    id: 'srv-3',
    category_id: 'cat-2',
    title_ar: 'صيانة وشحن تكييفات',
    description_ar: 'تنظيف الفلاتر وفحص غاز الفريون وصيانة الكومبريسور.',
    base_price_estimate: 350,
    is_active: true,
    category: FALLBACK_CATEGORIES[1],
  },
  {
    id: 'srv-4',
    category_id: 'cat-2',
    title_ar: 'تصليح غسالات أوتوماتيك وثلاجات',
    description_ar: 'صيانة منزلية فورية للأجهزة الكهربائية بكفر الشيخ والمدن المجاورة.',
    base_price_estimate: 250,
    is_active: true,
    category: FALLBACK_CATEGORIES[1],
  },
  {
    id: 'srv-5',
    category_id: 'cat-3',
    title_ar: 'تشطيب شقق ودهانات ديكورية',
    description_ar: 'دهانات حديثة ومقاومة للرطوبة مع اختيار الألوان بدقة.',
    base_price_estimate: 1200,
    is_active: true,
    category: FALLBACK_CATEGORIES[2],
  },
  {
    id: 'srv-6',
    category_id: 'cat-4',
    title_ar: 'غسيل سجاد ومفروشات بالبخار',
    description_ar: 'غسيل وتعقيم السجاد والمجالس في الموقع بأحدث أجهزة البخار.',
    base_price_estimate: 300,
    is_active: true,
    category: FALLBACK_CATEGORIES[3],
  },
];

export async function fetchServiceCategories(): Promise<ServiceCategory[]> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_CATEGORIES;
  }

  try {
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('Using fallback service categories:', error?.message);
      return FALLBACK_CATEGORIES;
    }

    return data as ServiceCategory[];
  } catch (e) {
    console.error('Failed to fetch categories from Supabase:', e);
    return FALLBACK_CATEGORIES;
  }
}

export async function fetchCatalogServices(
  filter?: ServiceDiscoveryFilter
): Promise<CatalogService[]> {
  if (!isSupabaseConfigured()) {
    let result = [...FALLBACK_SERVICES];
    if (filter?.categoryId) {
      result = result.filter((s) => s.category_id === filter.categoryId);
    }
    if (filter?.searchQuery) {
      const q = filter.searchQuery.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.title_ar.toLowerCase().includes(q) ||
          (s.description_ar && s.description_ar.toLowerCase().includes(q))
      );
    }
    if (filter?.maxPrice) {
      result = result.filter(
        (s) => s.base_price_estimate && s.base_price_estimate <= filter.maxPrice!
      );
    }
    return result;
  }

  try {
    let query = supabase
      .from('services')
      .select('*, category:service_categories(*)')
      .eq('is_active', true);

    if (filter?.categoryId) {
      query = query.eq('category_id', filter.categoryId);
    }

    if (filter?.searchQuery) {
      query = query.ilike('title_ar', `%${filter.searchQuery}%`);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      let result = [...FALLBACK_SERVICES];
      if (filter?.categoryId) {
        result = result.filter((s) => s.category_id === filter.categoryId);
      }
      if (filter?.searchQuery) {
        const q = filter.searchQuery.trim().toLowerCase();
        result = result.filter((s) => s.title_ar.toLowerCase().includes(q));
      }
      return result;
    }

    let items = data as CatalogService[];

    if (filter?.maxPrice) {
      items = items.filter(
        (s) => s.base_price_estimate && s.base_price_estimate <= filter.maxPrice!
      );
    }

    if (filter?.sortBy === 'price_low') {
      items.sort((a, b) => (a.base_price_estimate || 0) - (b.base_price_estimate || 0));
    } else if (filter?.sortBy === 'price_high') {
      items.sort((a, b) => (b.base_price_estimate || 0) - (a.base_price_estimate || 0));
    }

    return items;
  } catch (e) {
    console.error('Failed to fetch services from Supabase:', e);
    return FALLBACK_SERVICES;
  }
}

export async function createServiceRequestInDb(payload: {
  customer_id: string;
  service_id: string;
  notes?: string;
  scheduled_for?: string;
  agreed_price?: number;
}): Promise<{ success: boolean; data?: ServiceRequestItem; error?: string }> {
  if (!isSupabaseConfigured()) {
    // Local simulation for disconnected state
    const newReq: ServiceRequestItem = {
      id: `req-${Date.now()}`,
      customer_id: payload.customer_id,
      provider_id: null,
      service_id: payload.service_id,
      status: 'pending',
      scheduled_for: payload.scheduled_for || new Date().toISOString(),
      notes: payload.notes || null,
      agreed_price: payload.agreed_price || 150,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      service: FALLBACK_SERVICES.find((s) => s.id === payload.service_id) || FALLBACK_SERVICES[0],
    };
    return { success: true, data: newReq };
  }

  try {
    const { data, error } = await supabase
      .from('service_requests')
      .insert({
        customer_id: payload.customer_id,
        service_id: payload.service_id,
        notes: payload.notes || null,
        scheduled_for: payload.scheduled_for || null,
        agreed_price: payload.agreed_price || null,
        status: 'pending',
      })
      .select('*, service:services(*)')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as ServiceRequestItem };
  } catch (e: any) {
    return { success: false, error: e?.message || 'تعذر إرسال طلب الخدمة' };
  }
}

export async function fetchCustomerServiceRequests(
  customerId: string
): Promise<ServiceRequestItem[]> {
  if (!isSupabaseConfigured()) {
    return [
      {
        id: 'req-101',
        customer_id: customerId,
        provider_id: 'prov-1',
        service_id: 'srv-1',
        status: 'pending',
        scheduled_for: new Date(Date.now() + 86400000).toISOString(),
        notes: 'يرجى الحضور صباحاً بعد الساعة 10',
        agreed_price: 180,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        service: FALLBACK_SERVICES[0],
      },
      {
        id: 'req-102',
        customer_id: customerId,
        provider_id: 'prov-2',
        service_id: 'srv-3',
        status: 'completed',
        scheduled_for: new Date(Date.now() - 172800000).toISOString(),
        notes: 'تنظيف تكييف الصالة',
        agreed_price: 350,
        created_at: new Date(Date.now() - 200000000).toISOString(),
        updated_at: new Date(Date.now() - 172800000).toISOString(),
        service: FALLBACK_SERVICES[2],
      },
    ];
  }

  try {
    const { data, error } = await supabase
      .from('service_requests')
      .select('*, service:services(*)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch service requests:', error.message);
      return [];
    }

    return (data as ServiceRequestItem[]) || [];
  } catch (e) {
    console.error('Error fetching customer service requests:', e);
    return [];
  }
}

export async function cancelServiceRequestInDb(
  requestId: string,
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('service_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('customer_id', customerId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'تعذر إلغاء الطلب' };
  }
}

export async function fetchCustomerRides(customerId: string): Promise<CustomerRideItem[]> {
  if (!isSupabaseConfigured()) {
    return [
      {
        id: 'ride-01',
        customer_id: customerId,
        driver_id: 'drv-1',
        pickup_address_text: 'شارع النصر، كفر الشيخ',
        dropoff_address_text: 'جامعة كفر الشيخ، كلية الهندسة',
        estimated_fare: 35,
        final_fare: 35,
        status: 'completed',
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
    ];
  }

  try {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      return [];
    }

    return (data as CustomerRideItem[]) || [];
  } catch (e) {
    return [];
  }
}

export async function fetchCustomerOrders(customerId: string): Promise<CustomerOrderItem[]> {
  if (!isSupabaseConfigured()) {
    return [
      {
        id: 'ord-01',
        customer_id: customerId,
        merchant_id: 'merch-1',
        total_amount: 245,
        status: 'delivered',
        notes: 'التسليم في الدور الثالث',
        created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
        merchant_store_name: 'سوبر ماركت الخضري كفر الشيخ',
      },
    ];
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, merchant:merchants(store_name)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      return [];
    }

    return (data || []).map((item: any) => ({
      ...item,
      merchant_store_name: item.merchant?.store_name || 'متجر كفراوي',
    }));
  } catch (e) {
    return [];
  }
}

export async function fetchCustomerJobApplications(
  customerId: string
): Promise<CustomerJobApplicationItem[]> {
  if (!isSupabaseConfigured()) {
    return [
      {
        id: 'app-01',
        job_post_id: 'job-1',
        applicant_id: customerId,
        cover_letter: 'مهندس برمجيات شغوف بالعمل في كفر الشيخ',
        status: 'submitted',
        created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
        job_title: 'مطور برمجيات Full Stack',
        company_name: 'شركة كفراوي للتقنية',
      },
    ];
  }

  try {
    const { data, error } = await supabase
      .from('job_applications')
      .select('*, job_post:job_posts(title, employer:employers(company_name))')
      .eq('applicant_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      return [];
    }

    return (data || []).map((item: any) => ({
      ...item,
      job_title: item.job_post?.title || 'وظيفة معلنة',
      company_name: item.job_post?.employer?.company_name || 'شركة كفر الشيخ',
    }));
  } catch (e) {
    return [];
  }
}
