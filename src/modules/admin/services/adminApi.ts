import { supabase } from '../../../lib/supabase';
import { AppRole, VerificationStatus } from '../../../types/auth';
import {
  type AdminStats,
  type MobilityAdminStats,
  type AdminRide,
  type LiveDriver,
  type CashLedgerEntry,
  type OperationsAlert,
  type CustomerSummary,
  type AdminAuditLog,
  STALE_HEARTBEAT_THRESHOLD_MS,
  type RideTimelineEvent,
} from '../types';

export type {
  AdminStats,
  MobilityAdminStats,
  AdminRide,
  LiveDriver,
  CashLedgerEntry,
  OperationsAlert,
  CustomerSummary,
  AdminAuditLog,
  RideTimelineEvent,
};
export { STALE_HEARTBEAT_THRESHOLD_MS };

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
   * Get administrative statistics across all database tables + Realtime Mobility KPIs
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

    // Fetch mobility specific stats
    const mobilityStats: MobilityAdminStats = {
      onlineDrivers: 0,
      approvedDrivers: 0,
      pendingDrivers: 0,
      activeRides: 0,
      searchingRides: 0,
      completedToday: 0,
      cancelledToday: 0,
      cashCollectedToday: 0,
      platformCommissionToday: 0,
      driverNetToday: 0,
      pendingCashToday: 0,
      totalRidesToday: 0,
    };

    try {
      // 1. Query drivers state
      const { data: driversData } = await supabase
        .from('drivers')
        .select('id, approval_status, is_online, last_seen');

      if (driversData) {
        const now = Date.now();
        for (const d of driversData) {
          if (d.approval_status === 'approved') {
            mobilityStats.approvedDrivers++;
            const isFresh = d.last_seen
              ? now - new Date(d.last_seen).getTime() <= STALE_HEARTBEAT_THRESHOLD_MS
              : false;
            if (d.is_online && isFresh) {
              mobilityStats.onlineDrivers++;
            }
          } else if (d.approval_status === 'pending') {
            mobilityStats.pendingDrivers++;
          }
        }
      }

      // 2. Query rides state for today and active rides
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const { data: ridesData } = await supabase
        .from('rides')
        .select('id, status, created_at, final_fare, estimated_fare, customer_total, driver_earning, platform_commission, payment_status')
        .or(`created_at.gte.${startOfToday},status.in.(requested,driver_assigned,arrived,in_transit)`);

      if (ridesData) {
        for (const r of ridesData) {
          const isToday = r.created_at >= startOfToday;
          if (isToday) {
            mobilityStats.totalRidesToday++;
          }

          if (r.status === 'requested') {
            mobilityStats.searchingRides++;
            mobilityStats.activeRides++;
          } else if (r.status === 'driver_assigned' || r.status === 'arrived' || r.status === 'in_transit') {
            mobilityStats.activeRides++;
          } else if (r.status === 'completed' && isToday) {
            mobilityStats.completedToday++;
            const fare = r.customer_total || r.final_fare || r.estimated_fare || 0;
            const comm = r.platform_commission !== undefined && r.platform_commission !== null
              ? r.platform_commission
              : Math.round(fare * 0.15 * 100) / 100;
            const net = r.driver_earning !== undefined && r.driver_earning !== null
              ? r.driver_earning
              : Math.round((fare - comm) * 100) / 100;

            if (r.payment_status === 'paid_cash') {
              mobilityStats.cashCollectedToday += fare;
              mobilityStats.platformCommissionToday += comm;
              mobilityStats.driverNetToday += net;
            } else if (r.payment_status === 'pending_cash_collection' || !r.payment_status || r.payment_status === 'pending') {
              mobilityStats.pendingCashToday += fare;
              mobilityStats.platformCommissionToday += comm;
              mobilityStats.driverNetToday += net;
            }
          } else if (r.status === 'cancelled' && isToday) {
            mobilityStats.cancelledToday++;
          }
        }
      }

      // Round all currency sums to 2 decimal places
      mobilityStats.cashCollectedToday = Math.round(mobilityStats.cashCollectedToday * 100) / 100;
      mobilityStats.platformCommissionToday = Math.round(mobilityStats.platformCommissionToday * 100) / 100;
      mobilityStats.driverNetToday = Math.round(mobilityStats.driverNetToday * 100) / 100;
      mobilityStats.pendingCashToday = Math.round(mobilityStats.pendingCashToday * 100) / 100;
    } catch (mobilityErr) {
      console.error('Error computing mobility admin stats:', mobilityErr);
    }

    return {
      ...(counts as any),
      mobility: mobilityStats,
    };
  },

  /**
   * Fetch Live Drivers with vehicles, current rides, last location, and financial summary
   */
  async getLiveDrivers(): Promise<LiveDriver[]> {
    const { data, error } = await supabase
      .from('drivers')
      .select(`
        *,
        profiles!drivers_profile_id_fkey (
          id,
          full_name,
          phone_number,
          avatar_url
        ),
        vehicles (
          id,
          make,
          model,
          year,
          plate_number,
          color,
          is_active
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ADMIN] Error fetching live drivers:', error);
      throw new Error(`تعذر جلب بيانات السائقين: ${error.message}`);
    }

    const driversList = data || [];
    if (driversList.length === 0) return [];

    // Query active rides and today's completed rides for these drivers
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const { data: ridesData } = await supabase
      .from('rides')
      .select('id, driver_id, status, pickup_address_text, dropoff_address_text, final_fare, estimated_fare, customer_total, driver_earning, platform_commission, payment_status, created_at')
      .not('driver_id', 'is', null);

    const activeRidesByDriver: Record<string, any> = {};
    const todayStatsByDriver: Record<string, { count: number; gross: number; commission: number; net: number }> = {};
    const totalCashDueByDriver: Record<string, number> = {};

    if (ridesData) {
      for (const r of ridesData) {
        if (!r.driver_id) continue;

        if (['driver_assigned', 'arrived', 'in_transit'].includes(r.status)) {
          activeRidesByDriver[r.driver_id] = {
            id: r.id,
            status: r.status,
            pickup_address: r.pickup_address_text,
            dropoff_address: r.dropoff_address_text,
          };
        }

        if (r.status === 'completed') {
          const fare = r.customer_total || r.final_fare || r.estimated_fare || 0;
          const comm = r.platform_commission !== undefined && r.platform_commission !== null
            ? r.platform_commission
            : Math.round(fare * 0.15 * 100) / 100;
          const net = r.driver_earning !== undefined && r.driver_earning !== null
            ? r.driver_earning
            : Math.round((fare - comm) * 100) / 100;

          // Cash owed to platform
          totalCashDueByDriver[r.driver_id] = (totalCashDueByDriver[r.driver_id] || 0) + comm;

          if (r.created_at >= startOfToday) {
            if (!todayStatsByDriver[r.driver_id]) {
              todayStatsByDriver[r.driver_id] = { count: 0, gross: 0, commission: 0, net: 0 };
            }
            todayStatsByDriver[r.driver_id].count++;
            todayStatsByDriver[r.driver_id].gross += fare;
            todayStatsByDriver[r.driver_id].commission += comm;
            todayStatsByDriver[r.driver_id].net += net;
          }
        }
      }
    }

    const currentTime = Date.now();

    return driversList.map((d: any) => {
      const activeVehicle = (d.vehicles || []).find((v: any) => v.is_active) || d.vehicles?.[0] || null;
      const isHeartbeatFresh = d.last_seen
        ? currentTime - new Date(d.last_seen).getTime() <= STALE_HEARTBEAT_THRESHOLD_MS
        : false;

      const is_stale = Boolean(d.is_online && !isHeartbeatFresh);
      const effectiveOnline = Boolean(d.is_online && isHeartbeatFresh && d.approval_status === 'approved');

      const todayStats = todayStatsByDriver[d.id] || { count: 0, gross: 0, commission: 0, net: 0 };

      return {
        id: d.id,
        profile_id: d.profile_id,
        national_id: d.national_id,
        license_number: d.license_number,
        approval_status: d.approval_status as VerificationStatus,
        is_online: effectiveOnline,
        rating_average: Number(d.rating_average || 0),
        created_at: d.created_at,
        updated_at: d.updated_at,
        last_seen: d.last_seen || null,
        last_latitude: d.last_latitude ? Number(d.last_latitude) : null,
        last_longitude: d.last_longitude ? Number(d.last_longitude) : null,
        is_stale,
        driver_name: d.profiles?.full_name || 'كابتن غير معروف',
        driver_phone: d.profiles?.phone_number || null,
        driver_avatar: d.profiles?.avatar_url || null,
        active_vehicle: activeVehicle
          ? {
              id: activeVehicle.id,
              make: activeVehicle.make,
              model: activeVehicle.model,
              year: activeVehicle.year,
              plate_number: activeVehicle.plate_number,
              color: activeVehicle.color,
              is_active: activeVehicle.is_active,
            }
          : null,
        active_ride: activeRidesByDriver[d.id] || null,
        today_rides_count: todayStats.count,
        today_gross: Math.round(todayStats.gross * 100) / 100,
        today_commission: Math.round(todayStats.commission * 100) / 100,
        today_net: Math.round(todayStats.net * 100) / 100,
        total_cash_due_to_platform: Math.round((totalCashDueByDriver[d.id] || 0) * 100) / 100,
      };
    });
  },

  /**
   * Fetch Live Rides with full customer, driver, vehicle, and financial data
   */
  async getLiveRides(limit: number = 100): Promise<AdminRide[]> {
    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        customer:customer_id (
          id,
          full_name,
          phone_number
        ),
        driver:driver_id (
          id,
          rating_average,
          profiles (
            full_name,
            phone_number
          )
        ),
        vehicle:vehicle_id (
          id,
          make,
          model,
          plate_number
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ADMIN] Error fetching live rides:', error);
      throw new Error(`تعذر جلب بيانات الرحلات: ${error.message}`);
    }

    return (data || []).map((r: any) => {
      const fare = r.customer_total || r.final_fare || r.estimated_fare || 0;
      const commission = r.platform_commission !== undefined && r.platform_commission !== null
        ? r.platform_commission
        : Math.round(fare * 0.15 * 100) / 100;
      const driverNet = r.driver_earning !== undefined && r.driver_earning !== null
        ? r.driver_earning
        : Math.round((fare - commission) * 100) / 100;

      // Approximate distance if coords available
      let distanceKm: number | undefined;
      if (r.pickup_latitude && r.pickup_longitude && r.dropoff_latitude && r.dropoff_longitude) {
        const dLat = (r.dropoff_latitude - r.pickup_latitude) * 111;
        const dLng = (r.dropoff_longitude - r.pickup_longitude) * 95;
        distanceKm = Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 10) / 10;
        if (distanceKm < 1) distanceKm = 1.2;
      }

      return {
        id: r.id,
        customer_id: r.customer_id,
        driver_id: r.driver_id,
        vehicle_id: r.vehicle_id,
        pickup_address_text: r.pickup_address_text,
        pickup_latitude: Number(r.pickup_latitude),
        pickup_longitude: Number(r.pickup_longitude),
        dropoff_address_text: r.dropoff_address_text,
        dropoff_latitude: Number(r.dropoff_latitude),
        dropoff_longitude: Number(r.dropoff_longitude),
        estimated_fare: r.estimated_fare ? Number(r.estimated_fare) : null,
        final_fare: r.final_fare ? Number(r.final_fare) : null,
        customer_total: fare,
        driver_earning: driverNet,
        platform_commission: commission,
        commission_rate: r.commission_rate || 0.15,
        payment_method: 'cash',
        payment_status: r.payment_status || (r.status === 'completed' ? 'pending_cash_collection' : 'pending'),
        status: r.status,
        cancelled_by: r.cancelled_by || null,
        cancellation_reason: r.cancellation_reason || null,
        cancelled_at: r.cancelled_at || null,
        created_at: r.created_at,
        updated_at: r.updated_at,
        customer_name: r.customer?.full_name || 'عميل غير معروف',
        customer_phone: r.customer?.phone_number || null,
        driver_name: r.driver?.profiles?.full_name || null,
        driver_phone: r.driver?.profiles?.phone_number || null,
        vehicle_info: r.vehicle ? `${r.vehicle.make} ${r.vehicle.model}` : undefined,
        vehicle_plate: r.vehicle?.plate_number || undefined,
        vehicle_model: r.vehicle ? `${r.vehicle.make} ${r.vehicle.model}` : undefined,
        distance_km: distanceKm,
        duration_min: distanceKm ? Math.round(distanceKm * 2.5) : undefined,
      };
    });
  },

  /**
   * Fetch Ride Timeline with full status transitions
   */
  async getRideTimeline(rideId: string, currentRide?: AdminRide): Promise<RideTimelineEvent[]> {
    const timelineEvents: RideTimelineEvent[] = [];

    try {
      // 1. Query status history table if exists
      const { data: historyData } = await supabase
        .from('ride_status_history')
        .select('*')
        .eq('ride_id', rideId)
        .order('created_at', { ascending: true });

      if (historyData && historyData.length > 0) {
        return historyData.map((h: any) => ({
          status: h.status,
          label: getStatusLabel(h.status),
          timestamp: h.created_at,
          actor_name: h.changed_by_name || 'النظام',
          note: h.note || undefined,
        }));
      }
    } catch {
      // Table might be dynamic
    }

    // 2. Synthesize verified timeline from ride record timestamps
    if (currentRide) {
      timelineEvents.push({
        status: 'requested',
        label: 'تم إرسال الطلب والبحث عن كابتن',
        timestamp: currentRide.created_at,
      });

      if (currentRide.driver_id && currentRide.status !== 'requested') {
        timelineEvents.push({
          status: 'driver_assigned',
          label: `تم قبول الطلب وتعيين الكابتن (${currentRide.driver_name || 'كابتن'})`,
          timestamp: currentRide.updated_at,
        });
      }

      if (['arrived', 'in_transit', 'completed'].includes(currentRide.status)) {
        timelineEvents.push({
          status: 'arrived',
          label: 'وصل الكابتن لنقطة الالتقاء',
          timestamp: currentRide.updated_at,
        });
      }

      if (['in_transit', 'completed'].includes(currentRide.status)) {
        timelineEvents.push({
          status: 'in_transit',
          label: 'صعد العميل وبدأت الرحلة نحو الوجهة',
          timestamp: currentRide.updated_at,
        });
      }

      if (currentRide.status === 'completed') {
        timelineEvents.push({
          status: 'completed',
          label: 'وصل العميل واكتملت الرحلة بنجاح',
          timestamp: currentRide.updated_at,
        });

        if (currentRide.payment_status === 'paid_cash') {
          timelineEvents.push({
            status: 'cash_paid',
            label: `تم استلام وتحصيل المبلغ نقداً (${currentRide.customer_total} ج.م)`,
            timestamp: currentRide.updated_at,
          });
        }
      }

      if (currentRide.status === 'cancelled') {
        timelineEvents.push({
          status: 'cancelled',
          label: `تم إلغاء الرحلة${currentRide.cancellation_reason ? ` (السبب: ${currentRide.cancellation_reason})` : ''}`,
          timestamp: currentRide.cancelled_at || currentRide.updated_at,
        });
      }
    }

    return timelineEvents;
  },

  /**
   * Fetch Driver Cash Ledger for Cash Control Room
   */
  async getCashLedger(period?: 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month'): Promise<CashLedgerEntry[]> {
    const { data: driversData } = await supabase
      .from('drivers')
      .select(`
        id,
        profiles (
          full_name,
          phone_number
        )
      `)
      .order('created_at', { ascending: false });

    if (!driversData || driversData.length === 0) return [];

    const { data: ridesData } = await supabase
      .from('rides')
      .select('driver_id, status, final_fare, estimated_fare, customer_total, driver_earning, platform_commission, payment_status')
      .eq('status', 'completed')
      .not('driver_id', 'is', null);

    const ledgerMap: Record<string, CashLedgerEntry> = {};

    for (const d of driversData) {
      const p = d.profiles as any;
      ledgerMap[d.id] = {
        driver_id: d.id,
        driver_name: p?.full_name || 'كابتن',
        driver_phone: p?.phone_number || null,
        completed_rides_count: 0,
        gross_cash: 0,
        collected_cash: 0,
        pending_cash: 0,
        platform_commission: 0,
        driver_net: 0,
        amount_due_to_platform: 0,
      };
    }

    if (ridesData) {
      for (const r of ridesData) {
        if (!r.driver_id || !ledgerMap[r.driver_id]) continue;
        const entry = ledgerMap[r.driver_id];
        const fare = r.customer_total || r.final_fare || r.estimated_fare || 0;
        const comm = r.platform_commission !== undefined && r.platform_commission !== null
          ? r.platform_commission
          : Math.round(fare * 0.15 * 100) / 100;
        const net = r.driver_earning !== undefined && r.driver_earning !== null
          ? r.driver_earning
          : Math.round((fare - comm) * 100) / 100;

        entry.completed_rides_count++;
        entry.gross_cash += fare;
        entry.platform_commission += comm;
        entry.driver_net += net;
        entry.amount_due_to_platform += comm;

        if (r.payment_status === 'paid_cash') {
          entry.collected_cash += fare;
        } else {
          entry.pending_cash += fare;
        }
      }
    }

    return Object.values(ledgerMap)
      .map((entry) => ({
        ...entry,
        gross_cash: Math.round(entry.gross_cash * 100) / 100,
        collected_cash: Math.round(entry.collected_cash * 100) / 100,
        pending_cash: Math.round(entry.pending_cash * 100) / 100,
        platform_commission: Math.round(entry.platform_commission * 100) / 100,
        driver_net: Math.round(entry.driver_net * 100) / 100,
        amount_due_to_platform: Math.round(entry.amount_due_to_platform * 100) / 100,
      }))
      .sort((a, b) => b.amount_due_to_platform - a.amount_due_to_platform);
  },

  /**
   * Fetch Customers summary for Customer Monitor
   */
  async getCustomersSummary(): Promise<CustomerSummary[]> {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number, avatar_url, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ADMIN] Error fetching profiles for customer monitor:', error);
      throw new Error(`تعذر جلب بيانات العملاء: ${error.message}`);
    }

    const { data: rides } = await supabase
      .from('rides')
      .select('customer_id, status, final_fare, estimated_fare, customer_total, created_at');

    const ridesByCustomer: Record<string, { total: number; completed: number; cancelled: number; spent: number; lastDate: string | null }> = {};

    if (rides) {
      for (const r of rides) {
        if (!ridesByCustomer[r.customer_id]) {
          ridesByCustomer[r.customer_id] = { total: 0, completed: 0, cancelled: 0, spent: 0, lastDate: null };
        }
        const c = ridesByCustomer[r.customer_id];
        c.total++;
        if (r.status === 'completed') {
          c.completed++;
          c.spent += (r.customer_total || r.final_fare || r.estimated_fare || 0);
        } else if (r.status === 'cancelled') {
          c.cancelled++;
        }
        if (!c.lastDate || r.created_at > c.lastDate) {
          c.lastDate = r.created_at;
        }
      }
    }

    return (profiles || []).map((p: any) => {
      const stats = ridesByCustomer[p.id] || { total: 0, completed: 0, cancelled: 0, spent: 0, lastDate: null };
      return {
        id: p.id,
        full_name: p.full_name || 'مستخدم غير محدد',
        phone_number: p.phone_number || null,
        avatar_url: p.avatar_url || null,
        created_at: p.created_at,
        total_rides: stats.total,
        completed_rides: stats.completed,
        cancelled_rides: stats.cancelled,
        rating_average: 5.0,
        last_ride_date: stats.lastDate,
        total_spent: Math.round(stats.spent * 100) / 100,
      };
    });
  },

  /**
   * Generate Operations Alerts in Realtime
   */
  async getOperationsAlerts(): Promise<OperationsAlert[]> {
    const alerts: OperationsAlert[] = [];
    const now = Date.now();

    try {
      // 1. Check for requested rides waiting too long (> 3 minutes)
      const { data: waitingRides } = await supabase
        .from('rides')
        .select('id, pickup_address_text, created_at')
        .eq('status', 'requested');

      if (waitingRides) {
        for (const r of waitingRides) {
          const waitMs = now - new Date(r.created_at).getTime();
          if (waitMs > 3 * 60 * 1000) {
            const minutes = Math.floor(waitMs / 60000);
            alerts.push({
              id: `alert-wait-${r.id}`,
              type: 'waiting_too_long',
              severity: minutes >= 6 ? 'critical' : 'warning',
              title: `طلب توصيل ينتظر كابتن منذ ${minutes} دقيقة`,
              description: `الرحلة (${r.id.substring(0, 8)}) في موقع: ${r.pickup_address_text} لم يقبلها أي كابتن حتى الآن.`,
              entity_id: r.id,
              entity_type: 'ride',
              created_at: r.created_at,
              action_label: 'عرض تفاصيل الرحلة',
            });
          }
        }
      }

      // 2. Check for stale online drivers
      const { data: staleDrivers } = await supabase
        .from('drivers')
        .select(`
          id,
          last_seen,
          profiles (
            full_name
          )
        `)
        .eq('is_online', true)
        .eq('approval_status', 'approved');

      if (staleDrivers) {
        for (const d of staleDrivers) {
          const p = d.profiles as any;
          const lastSeenMs = d.last_seen ? now - new Date(d.last_seen).getTime() : Infinity;
          if (lastSeenMs > STALE_HEARTBEAT_THRESHOLD_MS) {
            const minutes = Math.floor(lastSeenMs / 60000);
            alerts.push({
              id: `alert-driver-stale-${d.id}`,
              type: 'driver_stale',
              severity: 'warning',
              title: `انقطاع اتصال نبض الكابتن (${p?.full_name || 'الكابتن'})`,
              description: `الكابتن مسجل كـ "متصل Online" ولكن آخر نبض GPS ورد منذ ${minutes > 60 ? '+60' : minutes} دقيقة.`,
              entity_id: d.id,
              entity_type: 'driver',
              created_at: d.last_seen || new Date().toISOString(),
              action_label: 'فحص ملف الكابتن',
            });
          }
        }
      }

      // 3. Check for stuck active rides (in_transit > 45 mins, arrived > 15 mins)
      const { data: activeRides } = await supabase
        .from('rides')
        .select('id, status, updated_at, pickup_address_text, dropoff_address_text')
        .in('status', ['arrived', 'in_transit']);

      if (activeRides) {
        for (const r of activeRides) {
          const durationMs = now - new Date(r.updated_at).getTime();
          if (r.status === 'arrived' && durationMs > 15 * 60 * 1000) {
            alerts.push({
              id: `alert-stuck-arr-${r.id}`,
              type: 'ride_stuck',
              severity: 'warning',
              title: 'الكابتن وصل نقطة الالتقاء وينتظر منذ أكثر من 15 دقيقة',
              description: `الرحلة (${r.id.substring(0, 8)}) في حالة "وصل الكابتن" دون بدء الرحلة.`,
              entity_id: r.id,
              entity_type: 'ride',
              created_at: r.updated_at,
              action_label: 'مراجعة الرحلة',
            });
          } else if (r.status === 'in_transit' && durationMs > 45 * 60 * 1000) {
            alerts.push({
              id: `alert-stuck-transit-${r.id}`,
              type: 'ride_stuck',
              severity: 'critical',
              title: 'الرحلة جارية منذ أكثر من 45 دقيقة',
              description: `الرحلة (${r.id.substring(0, 8)}) بين "${r.pickup_address_text}" و "${r.dropoff_address_text}" تستغرق وقتاً طويلاً.`,
              entity_id: r.id,
              entity_type: 'ride',
              created_at: r.updated_at,
              action_label: 'متابعة مسار الرحلة',
            });
          }
        }
      }

      // 4. Check for completed rides with pending cash collection > 2 hours
      const { data: pendingCashRides } = await supabase
        .from('rides')
        .select('id, updated_at, final_fare, estimated_fare, customer_total')
        .eq('status', 'completed')
        .eq('payment_status', 'pending_cash_collection');

      if (pendingCashRides) {
        for (const r of pendingCashRides) {
          const delayMs = now - new Date(r.updated_at).getTime();
          if (delayMs > 2 * 60 * 60 * 1000) {
            const fare = r.customer_total || r.final_fare || r.estimated_fare || 0;
            alerts.push({
              id: `alert-cash-pending-${r.id}`,
              type: 'cash_pending',
              severity: 'warning',
              title: `تحصيل نقدي معلق بمبلغ ${fare} ج.م منذ فترة`,
              description: `الرحلة (${r.id.substring(0, 8)}) مكتملة ولم يتم تسجيل استلام الكاش من قِبل الكابتن أو الإدارة.`,
              entity_id: r.id,
              entity_type: 'ride',
              created_at: r.updated_at,
              action_label: 'تأكيد استلام الكاش',
            });
          }
        }
      }
    } catch (alertErr) {
      console.error('Error generating operations alerts:', alertErr);
    }

    return alerts;
  },

  /**
   * Update Driver Approval Status using secure RPC
   */
  async updateDriverStatus(driverId: string, status: VerificationStatus): Promise<void> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('يجب تسجيل الدخول كمدير للنظام أولاً.');
    }

    const { data, error } = await supabase.rpc('admin_approve_driver', {
      p_driver_id: driverId,
      p_status: status,
    });

    if (error) {
      console.error('[ADMIN] RPC admin_approve_driver failed:', error);
      throw new Error(`تعذر تحديث حالة السائق: ${error.message}`);
    }

    if (data?.success !== true) {
      console.error('[ADMIN] admin_approve_driver returned failure:', data);
      throw new Error(data?.message || 'لم تكتمل عملية الاعتماد بنجاح.');
    }
  },

  /**
   * Mark cash payment received (Driver or Admin)
   */
  async markCashPaymentReceived(rideId: string): Promise<{ success: boolean; amount?: number }> {
    try {
      const { data, error } = await supabase.rpc('mark_cash_payment_received', {
        p_ride_id: rideId,
      });

      if (error) {
        console.error('[ADMIN] Error in mark_cash_payment_received RPC:', error);
        throw new Error(error.message);
      }

      return data || { success: true };
    } catch (e: any) {
      console.error('[ADMIN] Error recording cash collection:', e);
      throw new Error(e.message || 'فشل تسجيل استلام المبلغ نقداً.');
    }
  },

  /**
   * Fetch all registered merchants
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
   * Update merchant status
   */
  async updateMerchantStatus(merchantId: string, status: VerificationStatus): Promise<void> {
    const { data: merchantData, error: fetchErr } = await supabase
      .from('merchants')
      .select('profile_id')
      .eq('id', merchantId)
      .single();

    if (fetchErr) {
      throw new Error(`تعذر جلب ملف التاجر: ${fetchErr.message}`);
    }
    const profileId = merchantData.profile_id;

    const { error } = await supabase
      .from('merchants')
      .update({ approval_status: status, updated_at: new Date().toISOString() })
      .eq('id', merchantId);

    if (error) {
      throw new Error(`تعذر تحديث حالة التاجر: ${error.message}`);
    }

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
   * Fetch all registered service providers
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
   * Update service provider status
   */
  async updateProviderStatus(providerId: string, status: VerificationStatus): Promise<void> {
    const { data: providerData, error: fetchErr } = await supabase
      .from('service_providers')
      .select('profile_id')
      .eq('id', providerId)
      .single();

    if (fetchErr) {
      throw new Error(`تعذر جلب ملف مقدم الخدمة: ${fetchErr.message}`);
    }
    const profileId = providerData.profile_id;

    const { error } = await supabase
      .from('service_providers')
      .update({ verification_status: status, updated_at: new Date().toISOString() })
      .eq('id', providerId);

    if (error) {
      throw new Error(`تعذر تحديث حالة مقدم الخدمة: ${error.message}`);
    }

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
      .order('created_at', { ascending: false })
      .limit(200);

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
   * Fetch recent orders
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
   * Fetch service requests
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

function getStatusLabel(status: string): string {
  switch (status) {
    case 'requested':
      return 'تم إرسال الطلب والبحث عن كابتن';
    case 'driver_assigned':
      return 'تم قبول الطلب وتعيين الكابتن';
    case 'arrived':
      return 'وصل الكابتن لنقطة الالتقاء';
    case 'in_transit':
      return 'بدأت الرحلة نحو الوجهة';
    case 'completed':
      return 'اكتملت الرحلة بنجاح';
    case 'cancelled':
      return 'تم إلغاء الرحلة';
    case 'paid_cash':
      return 'تم تأكيد تحصيل المبلغ نقداً';
    default:
      return status;
  }
}
