import { supabase, isSupabaseConfigured } from '../../../lib/supabase';

export interface MerchantProfile {
  id: string;
  profile_id: string;
  store_name: string;
  store_logo_url: string | null;
  bio: string | null;
  approval_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rating_average: number;
  created_at: string;
  profile?: {
    full_name: string;
    phone_number: string | null;
  };
}

export interface ProductCategory {
  id: string;
  name_ar: string;
  icon_url: string | null;
}

export interface Product {
  id: string;
  merchant_id: string;
  category_id: string;
  title_ar: string;
  description_ar: string | null;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  category?: ProductCategory;
  merchant?: {
    store_name: string;
  };
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_title_snapshot: string;
  unit_price_at_purchase: number;
  quantity: number;
  total_price: number;
}

export interface Order {
  id: string;
  customer_id: string;
  merchant_id: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  notes: string | null;
  created_at: string;
  customer_profile?: {
    full_name: string;
    phone_number: string | null;
  };
  order_items?: OrderItem[];
}

export function getAllowedNextStatuses(currentStatus: Order['status']): Order['status'][] {
  switch (currentStatus) {
    case 'pending':
      return ['confirmed', 'cancelled'];
    case 'confirmed':
      return ['processing', 'cancelled'];
    case 'processing':
      return ['out_for_delivery', 'cancelled'];
    case 'out_for_delivery':
      return ['delivered', 'cancelled'];
    default:
      return [];
  }
}

export function getStatusArabicLabel(status: Order['status']): string {
  switch (status) {
    case 'pending': return 'قيد المراجعة';
    case 'confirmed': return 'تم تأكيد الطلب';
    case 'processing': return 'جاري التحضير';
    case 'out_for_delivery': return 'خرج للتوصيل';
    case 'delivered': return 'تم التوصيل';
    case 'cancelled': return 'ملغي';
    default: return status;
  }
}

// Fallback seed data for local testing when Supabase is disconnected
const FALLBACK_PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 'pcat-1', name_ar: 'بقالة ومواد غذائية', icon_url: 'shopping-bag' },
  { id: 'pcat-2', name_ar: 'مأكولات ومطاعم محلية', icon_url: 'utensils' },
  { id: 'pcat-3', name_ar: 'إلكترونيات وهواتف', icon_url: 'smartphone' },
  { id: 'pcat-4', name_ar: 'ملابس وأزياء', icon_url: 'shirt' },
  { id: 'pcat-5', name_ar: 'مستلزمات منزلية', icon_url: 'home' },
  { id: 'pcat-6', name_ar: 'أدوية ومستلزمات طبية', icon_url: 'pill' },
];

let localProducts: Product[] = [
  {
    id: 'prod-101',
    merchant_id: 'merch-test-id',
    category_id: 'pcat-1',
    title_ar: 'كيلو أرز بلدي فاخر',
    description_ar: 'أرز كفر الشيخ درجة أولى مصفى ومعبأ بعناية فائقة.',
    price: 32,
    stock_quantity: 150,
    is_active: true,
    created_at: new Date().toISOString(),
    category: FALLBACK_PRODUCT_CATEGORIES[0],
  },
  {
    id: 'prod-102',
    merchant_id: 'merch-test-id',
    category_id: 'pcat-1',
    title_ar: 'زيت عباد الشمس 1 لتر',
    description_ar: 'زيت نقي وصحي مناسب لجميع الاستخدامات المنزلية.',
    price: 75,
    stock_quantity: 45,
    is_active: true,
    created_at: new Date().toISOString(),
    category: FALLBACK_PRODUCT_CATEGORIES[0],
  },
  {
    id: 'prod-103',
    merchant_id: 'merch-test-id',
    category_id: 'pcat-2',
    title_ar: 'وجبة كبسة دجاج كفر الشيخ',
    description_ar: 'نصف دجاجة شواية مع الأرز البسمتي المبهر والدقوس والشوربة.',
    price: 135,
    stock_quantity: 20,
    is_active: true,
    created_at: new Date().toISOString(),
    category: FALLBACK_PRODUCT_CATEGORIES[1],
  },
];

let localMerchant: MerchantProfile | null = null;
let localOrders: Order[] = [
  {
    id: 'ord-501',
    customer_id: 'customer-test-id',
    merchant_id: 'merch-test-id',
    total_amount: 139,
    status: 'pending',
    notes: 'يرجى توصيل الطلب حاراً وبسرعة.',
    created_at: new Date().toISOString(),
    customer_profile: {
      full_name: 'أحمد محمود الرفاعي',
      phone_number: '01012341234',
    },
    order_items: [
      {
        id: 'ord-item-1',
        order_id: 'ord-501',
        product_id: 'prod-101',
        product_title_snapshot: 'كيلو أرز بلدي فاخر',
        unit_price_at_purchase: 32,
        quantity: 2,
        total_price: 64,
      },
      {
        id: 'ord-item-2',
        order_id: 'ord-501',
        product_id: 'prod-102',
        product_title_snapshot: 'زيت عباد الشمس 1 لتر',
        unit_price_at_purchase: 75,
        quantity: 1,
        total_price: 75,
      },
    ],
  },
];

export const merchantApi = {
  /**
   * Get Merchant Profile for logged in user
   */
  async getMerchantProfile(profileId: string): Promise<MerchantProfile | null> {
    if (!isSupabaseConfigured()) {
      if (localMerchant && localMerchant.profile_id === profileId) {
        return localMerchant;
      }
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*, profile:profiles(full_name, phone_number)')
        .eq('profile_id', profileId)
        .maybeSingle();

      if (error) throw error;
      return data as MerchantProfile;
    } catch (e) {
      console.error('Error fetching merchant profile:', e);
      return null;
    }
  },

  /**
   * Create Merchant Profile
   */
  async createMerchantProfile(payload: {
    profile_id: string;
    store_name: string;
    bio: string;
    store_logo_url?: string;
  }): Promise<MerchantProfile> {
    if (!isSupabaseConfigured()) {
      localMerchant = {
        id: 'merch-test-id',
        profile_id: payload.profile_id,
        store_name: payload.store_name,
        bio: payload.bio,
        store_logo_url: payload.store_logo_url || null,
        approval_status: 'pending',
        rating_average: 5.0,
        created_at: new Date().toISOString(),
      };
      return localMerchant;
    }

    const { data, error } = await supabase
      .from('merchants')
      .insert({
        profile_id: payload.profile_id,
        store_name: payload.store_name,
        bio: payload.bio,
        store_logo_url: payload.store_logo_url || null,
        approval_status: 'pending',
      })
      .select('*, profile:profiles(full_name, phone_number)')
      .single();

    if (error) {
      throw error;
    }
    return data as MerchantProfile;
  },

  /**
   * Fetch Product Categories
   */
  async getProductCategories(): Promise<ProductCategory[]> {
    if (!isSupabaseConfigured()) {
      return FALLBACK_PRODUCT_CATEGORIES;
    }

    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as ProductCategory[];
    } catch (e) {
      return FALLBACK_PRODUCT_CATEGORIES;
    }
  },

  /**
   * Get Products of a Merchant
   */
  async getMerchantProducts(merchantId: string): Promise<Product[]> {
    if (!isSupabaseConfigured()) {
      return localProducts.filter((p) => p.merchant_id === merchantId);
    }

    const { data, error } = await supabase
      .from('products')
      .select('*, category:product_categories(*)')
      .eq('merchant_id', merchantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Product[];
  },

  /**
   * Add Product
   */
  async addProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
    if (!isSupabaseConfigured()) {
      const cats = await this.getProductCategories();
      const newProd: Product = {
        ...product,
        id: `prod-${Date.now()}`,
        created_at: new Date().toISOString(),
        category: cats.find((c) => c.id === product.category_id),
      };
      localProducts.unshift(newProd);
      return newProd;
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        merchant_id: product.merchant_id,
        category_id: product.category_id,
        title_ar: product.title_ar,
        description_ar: product.description_ar,
        price: product.price,
        stock_quantity: product.stock_quantity,
        is_active: product.is_active,
      })
      .select('*, category:product_categories(*)')
      .single();

    if (error) throw error;
    return data as Product;
  },

  /**
   * Update Product
   */
  async updateProduct(productId: string, updates: Partial<Product>): Promise<Product> {
    if (!isSupabaseConfigured()) {
      const idx = localProducts.findIndex((p) => p.id === productId);
      if (idx !== -1) {
        localProducts[idx] = { ...localProducts[idx], ...updates };
        return localProducts[idx];
      }
      throw new Error('Product not found');
    }

    const { data, error } = await supabase
      .from('products')
      .update({
        category_id: updates.category_id,
        title_ar: updates.title_ar,
        description_ar: updates.description_ar,
        price: updates.price,
        stock_quantity: updates.stock_quantity,
        is_active: updates.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .select('*, category:product_categories(*)')
      .single();

    if (error) throw error;
    return data as Product;
  },

  /**
   * Delete Product
   */
  async deleteProduct(productId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      localProducts = localProducts.filter((p) => p.id !== productId);
      return;
    }

    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', productId);

    if (error) throw error;
  },

  /**
   * Get Orders of a Merchant
   */
  async getMerchantOrders(merchantId: string): Promise<Order[]> {
    if (!isSupabaseConfigured()) {
      return localOrders.filter((o) => o.merchant_id === merchantId);
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*, customer_profile:profiles!orders_customer_id_fkey(full_name, phone_number)')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch order items for each order
    const ordersWithItems = await Promise.all(
      (data || []).map(async (order) => {
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);

        return {
          ...order,
          order_items: itemsError ? [] : items,
        };
      })
    );

    return ordersWithItems as Order[];
  },

  /**
   * Update Order Status
   */
  async updateOrderStatus(
    orderId: string,
    status: Order['status'],
    changedBy: string
  ): Promise<void> {
    if (!isSupabaseConfigured()) {
      const idx = localOrders.findIndex((o) => o.id === orderId);
      if (idx !== -1) {
        const currentStatus = localOrders[idx].status;
        const allowed = getAllowedNextStatuses(currentStatus);
        if (!allowed.includes(status)) {
          throw new Error('لا يمكن الانتقال من حالة الطلب الحالية إلى هذه الحالة.');
        }
        localOrders[idx].status = status;
        return;
      }
      throw new Error('الطلب غير موجود.');
    }

    // Fetch the current status first from Supabase to prevent bypass
    const { data: orderData, error: fetchError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError || !orderData) {
      throw new Error('الطلب غير موجود في قاعدة البيانات.');
    }

    const currentStatus = orderData.status as Order['status'];
    const allowed = getAllowedNextStatuses(currentStatus);
    if (!allowed.includes(status)) {
      throw new Error('لا يمكن الانتقال من حالة الطلب الحالية إلى هذه الحالة.');
    }

    // Start a transaction-like update
    const { error: orderError } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (orderError) {
      console.error('Error updating order status:', orderError);
      throw new Error('فشل تحديث حالة الطلب في قاعدة البيانات.');
    }

    // Insert history
    await supabase.from('order_status_history').insert({
      order_id: orderId,
      status,
      changed_by: changedBy,
    });
  },

  /**
   * Public/Customer side: Get all approved merchants
   */
  async getApprovedMerchants(): Promise<MerchantProfile[]> {
    if (!isSupabaseConfigured()) {
      return localMerchant ? [localMerchant] : [
        {
          id: 'merch-test-id',
          profile_id: 'merch-test-profile-id',
          store_name: 'سوبر ماركت كفراوي النموذجي',
          bio: 'المتجر الرسمي لتوفير المواد الغذائية والتموينية بأسعار مميزة لأهالي كفر الشيخ.',
          store_logo_url: null,
          approval_status: 'approved',
          rating_average: 4.8,
          created_at: new Date().toISOString(),
        }
      ];
    }

    const { data, error } = await supabase
      .from('merchants')
      .select('*, profile:profiles(full_name, phone_number)')
      .eq('approval_status', 'approved');

    if (error) throw error;
    return data as MerchantProfile[];
  },

  /**
   * Public/Customer side: Fetch all active products
   */
  async getAllActiveProducts(categoryId?: string, search?: string): Promise<Product[]> {
    if (!isSupabaseConfigured()) {
      let result = [...localProducts].filter((p) => p.is_active);
      if (categoryId) {
        result = result.filter((p) => p.category_id === categoryId);
      }
      if (search) {
        result = result.filter((p) => p.title_ar.includes(search) || (p.description_ar && p.description_ar.includes(search)));
      }
      return result;
    }

    let query = supabase
      .from('products')
      .select('*, category:product_categories(*), merchant:merchants(store_name, approval_status)')
      .eq('is_active', true)
      .is('deleted_at', null);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (search) {
      query = query.ilike('title_ar', `%${search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    // Filter products whose merchants are approved
    return (data || []).filter((p: any) => p.merchant?.approval_status === 'approved') as Product[];
  },

  /**
   * Create customer order from cart items
   */
  async createCustomerOrder(payload: {
    customer_id: string;
    merchant_id: string;
    total_amount: number;
    notes: string;
    items: {
      product_id: string;
      product_title: string;
      price: number;
      quantity: number;
    }[];
  }): Promise<Order> {
    if (!isSupabaseConfigured()) {
      const newOrd: Order = {
        id: `ord-${Date.now()}`,
        customer_id: payload.customer_id,
        merchant_id: payload.merchant_id,
        total_amount: payload.total_amount,
        status: 'pending',
        notes: payload.notes || null,
        created_at: new Date().toISOString(),
        customer_profile: {
          full_name: 'أحمد محمود الرفاعي',
          phone_number: '01012341234',
        },
        order_items: payload.items.map((it, idx) => ({
          id: `ord-item-${idx}-${Date.now()}`,
          order_id: `ord-${Date.now()}`,
          product_id: it.product_id,
          product_title_snapshot: it.product_title,
          unit_price_at_purchase: it.price,
          quantity: it.quantity,
          total_price: it.price * it.quantity,
        })),
      };
      localOrders.unshift(newOrd);
      return newOrd;
    }

    // Step 1: Insert into Orders
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: payload.customer_id,
        merchant_id: payload.merchant_id,
        total_amount: payload.total_amount,
        notes: payload.notes || null,
        status: 'pending',
      })
      .select('*')
      .single();

    if (orderError) throw orderError;

    // Step 2: Insert into Order Items
    const itemsPayload = payload.items.map((item) => ({
      order_id: orderData.id,
      product_id: item.product_id,
      product_title_snapshot: item.product_title,
      unit_price_at_purchase: item.price,
      quantity: item.quantity,
      total_price: item.price * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsPayload);

    if (itemsError) throw itemsError;

    // Step 3: Insert Order History
    await supabase.from('order_status_history').insert({
      order_id: orderData.id,
      status: 'pending',
      changed_by: payload.customer_id,
    });

    return orderData as Order;
  },

  /**
   * Admin-Only: Fetch all merchants
   */
  async adminGetAllMerchants(): Promise<MerchantProfile[]> {
    if (!isSupabaseConfigured()) {
      return localMerchant ? [localMerchant] : [];
    }

    const { data, error } = await supabase
      .from('merchants')
      .select('*, profile:profiles(full_name, phone_number)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as MerchantProfile[];
  },

  /**
   * Admin-Only: Approve or Decline Merchant Store
   */
  async adminUpdateMerchantStatus(
    merchantId: string,
    status: MerchantProfile['approval_status']
  ): Promise<void> {
    if (!isSupabaseConfigured()) {
      if (localMerchant && localMerchant.id === merchantId) {
        localMerchant.approval_status = status;
      }
      return;
    }

    const { error } = await supabase
      .from('merchants')
      .update({ approval_status: status, updated_at: new Date().toISOString() })
      .eq('id', merchantId);

    if (error) throw error;
  },
};
