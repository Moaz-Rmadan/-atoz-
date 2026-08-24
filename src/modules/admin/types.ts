import { VerificationStatus, AppRole } from '../../types/auth';
import { RideStatus } from '../customer/services/mobilityApi';

export const STALE_HEARTBEAT_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes threshold for stale driver heartbeat

export interface MobilityAdminStats {
  onlineDrivers: number;
  approvedDrivers: number;
  pendingDrivers: number;
  activeRides: number;
  searchingRides: number;
  completedToday: number;
  cancelledToday: number;
  cashCollectedToday: number;
  platformCommissionToday: number;
  driverNetToday: number;
  pendingCashToday: number;
  totalRidesToday: number;
}

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
  mobility: MobilityAdminStats;
}

export interface RideTimelineEvent {
  status: RideStatus | 'cash_paid';
  label: string;
  timestamp: string | null;
  actor_name?: string;
  note?: string;
}

export interface AdminRide {
  id: string;
  customer_id: string;
  driver_id: string | null;
  vehicle_id: string | null;
  pickup_address_text: string;
  pickup_latitude: number;
  pickup_longitude: number;
  dropoff_address_text: string;
  dropoff_latitude: number;
  dropoff_longitude: number;
  estimated_fare: number | null;
  final_fare: number | null;
  customer_total?: number | null;
  driver_earning?: number | null;
  platform_commission?: number | null;
  commission_rate?: number | null;
  payment_method?: 'cash';
  payment_status?: 'pending' | 'pending_cash_collection' | 'paid_cash' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  status: RideStatus;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_phone?: string | null;
  driver_name?: string;
  driver_phone?: string | null;
  vehicle_info?: string;
  vehicle_plate?: string;
  vehicle_model?: string;
  distance_km?: number;
  duration_min?: number;
  eta_minutes?: number;
  timeline?: RideTimelineEvent[];
}

export interface LiveDriver {
  id: string;
  profile_id: string;
  national_id: string;
  license_number: string;
  approval_status: VerificationStatus;
  is_online: boolean;
  rating_average: number;
  created_at: string;
  updated_at?: string;
  last_seen?: string | null;
  last_latitude?: number | null;
  last_longitude?: number | null;
  is_stale: boolean;
  driver_name: string;
  driver_phone: string | null;
  driver_avatar?: string | null;
  active_vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
    plate_number: string;
    color: string | null;
    is_active: boolean;
  } | null;
  active_ride?: {
    id: string;
    status: RideStatus;
    pickup_address: string;
    dropoff_address: string;
  } | null;
  today_rides_count: number;
  today_gross: number;
  today_commission: number;
  today_net: number;
  total_cash_due_to_platform: number;
}

export interface CashLedgerEntry {
  driver_id: string;
  driver_name: string;
  driver_phone: string | null;
  completed_rides_count: number;
  gross_cash: number;
  collected_cash: number;
  pending_cash: number;
  platform_commission: number;
  driver_net: number;
  amount_due_to_platform: number;
}

export interface OperationsAlert {
  id: string;
  type: 'waiting_too_long' | 'driver_stale' | 'ride_stuck' | 'cash_pending' | 'gps_lost' | 'cancel_spike';
  severity: 'warning' | 'critical' | 'info';
  title: string;
  description: string;
  entity_id?: string;
  entity_type?: 'ride' | 'driver';
  created_at: string;
  action_label?: string;
}

export interface CustomerSummary {
  id: string;
  full_name: string;
  phone_number: string | null;
  avatar_url?: string | null;
  created_at: string;
  total_rides: number;
  completed_rides: number;
  cancelled_rides: number;
  rating_average?: number;
  last_ride_date?: string | null;
  total_spent: number;
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
