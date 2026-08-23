// Customer Domain Types for Services, Requests, Rides, Orders & Applications

export interface ServiceCategory {
  id: string;
  name_ar: string;
  description_ar: string | null;
  icon_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
}

export interface CatalogService {
  id: string;
  category_id: string;
  title_ar: string;
  description_ar: string | null;
  base_price_estimate: number | null;
  is_active: boolean;
  created_at?: string;
  category?: ServiceCategory;
}

export interface ServiceProviderProfile {
  id: string;
  profile_id: string;
  bio: string | null;
  verification_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rating_average: number;
  jobs_completed_count: number;
  profile?: {
    full_name: string;
    phone_number: string | null;
    avatar_url: string | null;
  };
}

export type ServiceRequestStatus =
  | 'draft'
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface ServiceRequestItem {
  id: string;
  customer_id: string;
  provider_id: string | null;
  service_id: string;
  address_id?: string | null;
  status: ServiceRequestStatus;
  scheduled_for: string | null;
  notes: string | null;
  agreed_price: number | null;
  created_at: string;
  updated_at: string;
  service?: CatalogService;
  provider?: ServiceProviderProfile;
}

export interface CustomerRideItem {
  id: string;
  customer_id: string;
  driver_id: string | null;
  pickup_address_text: string;
  dropoff_address_text: string;
  estimated_fare: number | null;
  final_fare: number | null;
  status: 'requested' | 'accepted' | 'arrived' | 'in_transit' | 'completed' | 'cancelled';
  created_at: string;
}

export interface CustomerOrderItem {
  id: string;
  customer_id: string;
  merchant_id: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  notes: string | null;
  created_at: string;
  merchant_store_name?: string;
}

export interface CustomerJobApplicationItem {
  id: string;
  job_post_id: string;
  applicant_id: string;
  cover_letter: string | null;
  status: 'submitted' | 'reviewed' | 'shortlisted' | 'rejected' | 'accepted';
  created_at: string;
  job_title?: string;
  company_name?: string;
}

export interface ServiceDiscoveryFilter {
  categoryId?: string;
  searchQuery?: string;
  maxPrice?: number;
  sortBy?: 'recommended' | 'price_low' | 'price_high' | 'rating';
}
