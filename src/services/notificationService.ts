import { supabase } from '../lib/supabase';

export type NotificationSeverity = 'info' | 'warning' | 'critical';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export type CustomerNotificationType =
  | 'ride_requested'
  | 'driver_assigned'
  | 'driver_arriving'
  | 'driver_arrived'
  | 'ride_started'
  | 'ride_completed'
  | 'ride_cancelled'
  | 'cash_payment_pending'
  | 'cash_payment_received'
  | 'system';

export type DriverNotificationType =
  | 'new_ride'
  | 'ride_accepted'
  | 'customer_cancelled'
  | 'driver_reminder'
  | 'ride_started'
  | 'ride_completed'
  | 'cash_pending'
  | 'platform_balance_due'
  | 'account_status'
  | 'system';

export type AdminNotificationType =
  | 'new_driver'
  | 'driver_approval_required'
  | 'new_ride'
  | 'ride_stuck'
  | 'driver_stale'
  | 'gps_lost'
  | 'cash_pending'
  | 'cancellation_alert'
  | 'system';

export type NotificationType = CustomerNotificationType | DriverNotificationType | AdminNotificationType | string;

export interface AppNotification {
  id: string;
  recipient_id: string;
  profile_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  body?: string;
  ride_id?: string | null;
  driver_id?: string | null;
  customer_id?: string | null;
  data?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  is_read: boolean;
  severity: NotificationSeverity;
  status: AlertStatus;
  created_at: string;
  read_at?: string | null;
}

export interface OperationsAlert {
  id: string;
  type: 'waiting_too_long' | 'driver_stale' | 'ride_stuck' | 'gps_lost' | 'cash_pending' | 'cancellation_spike' | string;
  severity: AlertSeverity;
  title: string;
  description: string;
  entity_id?: string;
  entity_type?: 'ride' | 'driver' | 'customer' | 'system';
  created_at: string;
  status: AlertStatus;
  action_label?: string;
}

const STALE_HEARTBEAT_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
const RIDE_STUCK_THRESHOLD_MS = 45 * 60 * 1000; // 45 minutes
const SEARCHING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export const notificationService = {
  /**
   * Fetch all notifications for a recipient profile ordered by creation date descending.
   */
  async getNotifications(profileId: string): Promise<AppNotification[]> {
    if (!profileId) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching notifications:', error);
      throw new Error('تعذر جلب الإشعارات.');
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      recipient_id: item.recipient_id || item.profile_id,
      profile_id: item.profile_id || item.recipient_id,
      type: item.type,
      title: item.title,
      message: item.message || item.body || '',
      body: item.body || item.message || '',
      ride_id: item.ride_id,
      driver_id: item.driver_id,
      customer_id: item.customer_id,
      data: item.data || item.payload || {},
      payload: item.payload || item.data || {},
      is_read: Boolean(item.is_read),
      severity: (item.severity as NotificationSeverity) || 'info',
      status: (item.status as AlertStatus) || 'active',
      created_at: item.created_at,
      read_at: item.read_at,
    }));
  },

  /**
   * Get unread notification count for user.
   */
  async getUnreadCount(profileId: string): Promise<number> {
    if (!profileId) return 0;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }

    return count || 0;
  },

  /**
   * Mark a single notification as read.
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('تعذر تحديث حالة الإشعار.');
    }
  },

  /**
   * Mark all notifications as read for a user profile.
   */
  async markAllAsRead(profileId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('profile_id', profileId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('تعذر تحديث الإشعارات.');
    }
  },

  /**
   * Subscribe to real-time notifications for a specific profile ID.
   */
  subscribeToNotifications(
    profileId: string,
    onNewNotification: (notification: AppNotification) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!profileId) {
      return () => {};
    }

    const channelName = `notifications-${profileId}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${profileId}`,
        },
        (payload) => {
          const item = payload.new as any;
          if (item) {
            const formatted: AppNotification = {
              id: item.id,
              recipient_id: item.recipient_id || item.profile_id,
              profile_id: item.profile_id || item.recipient_id,
              type: item.type,
              title: item.title,
              message: item.message || item.body || '',
              body: item.body || item.message || '',
              ride_id: item.ride_id,
              driver_id: item.driver_id,
              customer_id: item.customer_id,
              data: item.data || item.payload || {},
              payload: item.payload || item.data || {},
              is_read: Boolean(item.is_read),
              severity: (item.severity as NotificationSeverity) || 'info',
              status: (item.status as AlertStatus) || 'active',
              created_at: item.created_at,
              read_at: item.read_at,
            };
            onNewNotification(formatted);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' && err && onError) {
          onError(new Error(err.message || 'فشل الاتصال اللحظي للإشعارات'));
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Generate Operations Alerts for Admin Dashboard based on real database state & thresholds.
   */
  async getOperationsAlerts(): Promise<OperationsAlert[]> {
    const alerts: OperationsAlert[] = [];
    const now = Date.now();

    try {
      // 1. Searching / Requested rides waiting too long (> 5 minutes)
      const { data: waitingRides } = await supabase
        .from('rides')
        .select('id, pickup_address_text, created_at, status')
        .eq('status', 'requested');

      if (waitingRides) {
        for (const r of waitingRides) {
          const waitMs = now - new Date(r.created_at).getTime();
          if (waitMs > SEARCHING_TIMEOUT_MS) {
            const minutes = Math.floor(waitMs / 60000);
            alerts.push({
              id: `alert-wait-${r.id}`,
              type: 'waiting_too_long',
              severity: minutes >= 10 ? 'critical' : 'warning',
              title: `رحلة قيد البحث عن كابتن منذ ${minutes} دقيقة`,
              description: `الرحلة (${r.id.substring(0, 8)}) في موقع: ${r.pickup_address_text} لم يتم تخصيص كابتن لها بعد.`,
              entity_id: r.id,
              entity_type: 'ride',
              created_at: r.created_at,
              status: 'active',
              action_label: 'عرض تفاصيل الرحلة',
            });
          }
        }
      }

      // 2. Stale drivers (online but last_seen older than threshold)
      const { data: staleDrivers } = await supabase
        .from('drivers')
        .select(`
          id,
          last_seen,
          approval_status,
          is_online,
          profiles (
            full_name
          )
        `)
        .eq('is_online', true)
        .eq('approval_status', 'approved');

      if (staleDrivers) {
        for (const d of staleDrivers) {
          const profile = d.profiles as any;
          const lastSeenMs = d.last_seen ? now - new Date(d.last_seen).getTime() : Infinity;
          if (lastSeenMs > STALE_HEARTBEAT_THRESHOLD_MS) {
            const minutes = Math.floor(lastSeenMs / 60000);
            alerts.push({
              id: `alert-stale-drv-${d.id}`,
              type: 'driver_stale',
              severity: 'warning',
              title: `توقف نبض الكابتن (${profile?.full_name || 'كابتن'})`,
              description: `الكابتن متصل ولكن لم يرسل تحديث موقع منذ ${minutes} دقيقة.`,
              entity_id: d.id,
              entity_type: 'driver',
              created_at: d.last_seen || new Date().toISOString(),
              status: 'active',
              action_label: 'فحص الكابتن',
            });
          }
        }
      }

      // 3. Pending Cash Collection rides
      const { data: pendingCashRides } = await supabase
        .from('rides')
        .select('id, created_at, customer_total, estimated_fare, payment_status')
        .eq('status', 'completed')
        .eq('payment_status', 'pending_cash_collection');

      if (pendingCashRides) {
        for (const r of pendingCashRides) {
          const hours = Math.floor((now - new Date(r.created_at).getTime()) / (3600 * 1000));
          if (hours >= 1) {
            alerts.push({
              id: `alert-cash-${r.id}`,
              type: 'cash_pending',
              severity: hours >= 6 ? 'critical' : 'warning',
              title: `تحصيل كاش معلق (${r.customer_total || r.estimated_fare || 0} ج.م)`,
              description: `رحلة مكتملة رقم (${r.id.substring(0, 8)}) لم يتم تأكيد تحصيل قيمتها النقدية منذ ${hours} ساعة.`,
              entity_id: r.id,
              entity_type: 'ride',
              created_at: r.created_at,
              status: 'active',
              action_label: 'مراجعة المالية',
            });
          }
        }
      }

      // 4. Pending Driver Approvals
      const { data: pendingDrivers } = await supabase
        .from('drivers')
        .select(`
          id,
          created_at,
          profiles (
            full_name
          )
        `)
        .eq('approval_status', 'pending');

      if (pendingDrivers) {
        for (const d of pendingDrivers) {
          const profile = d.profiles as any;
          alerts.push({
            id: `alert-driver-approval-${d.id}`,
            type: 'driver_approval_required',
            severity: 'info',
            title: `طلب اعتماد كابتن جديد`,
            description: `الكابتن (${profile?.full_name || 'جديد'}) ينتظر مراجعة الأوراق والاعتماد.`,
            entity_id: d.id,
            entity_type: 'driver',
            created_at: d.created_at,
            status: 'active',
            action_label: 'مراجعة الكابتن',
          });
        }
      }
    } catch (err) {
      console.error('Error generating operations alerts:', err);
    }

    return alerts;
  },
};
