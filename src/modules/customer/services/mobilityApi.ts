import { supabase } from '../../../lib/supabase';
import { VerificationStatus } from '../../../types/auth';

export interface DriverProfile {
  id: string;
  profile_id: string;
  national_id: string;
  license_number: string;
  approval_status: VerificationStatus;
  is_online: boolean;
  rating_average: number;
  created_at: string;
  driver_name?: string;
  driver_phone?: string | null;
}

export interface Vehicle {
  id: string;
  driver_id: string;
  make: string;
  model: string;
  year: number;
  plate_number: string;
  color: string | null;
  is_active: boolean;
  created_at: string;
}

export type RideStatus = 'requested' | 'driver_assigned' | 'arrived' | 'in_transit' | 'completed' | 'cancelled';

export interface Ride {
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
  payment_method?: 'cash' | 'wallet' | 'card' | 'online';
  payment_status?: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  status: RideStatus;
  created_at: string;
  updated_at: string;
  
  // Relations (optional for display)
  customer_name?: string;
  customer_phone?: string | null;
  driver_name?: string;
  driver_phone?: string | null;
  vehicle_info?: string;
}

export interface LocationUpdate {
  id: number;
  ride_id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  created_at: string;
}

// Check if Supabase client is configured
const isSupabaseConfigured = (): boolean => {
  return !!supabase;
};

// In-memory fallbacks for preview mode (so everything remains 100% functional)
let mockDrivers: DriverProfile[] = [
  {
    id: 'drv-mock-1',
    profile_id: 'usr-mock-driver-1',
    national_id: '29901011234567',
    license_number: '987654321',
    approval_status: 'approved',
    is_online: true,
    rating_average: 4.8,
    created_at: new Date().toISOString(),
    driver_name: 'الكابتن محمد علي',
    driver_phone: '01023456789'
  }
];

let mockVehicles: Vehicle[] = [
  {
    id: 'veh-mock-1',
    driver_id: 'drv-mock-1',
    make: 'هيونداي',
    model: 'إلنترا',
    year: 2021,
    plate_number: 'ل ق ر 9514',
    color: 'فضي ميتاليك',
    is_active: true,
    created_at: new Date().toISOString()
  }
];

let mockRides: Ride[] = [
  {
    id: 'ride-mock-example',
    customer_id: 'usr-customer-id',
    driver_id: 'drv-mock-1',
    vehicle_id: 'veh-mock-1',
    pickup_address_text: 'محطة قطار كفر البطيخ، دمياط',
    pickup_latitude: 31.4055,
    pickup_longitude: 31.7385,
    dropoff_address_text: 'مستشفى كفر البطيخ المركزي',
    dropoff_latitude: 31.4025,
    dropoff_longitude: 31.7570,
    estimated_fare: 25,
    final_fare: 25,
    status: 'completed',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    customer_name: 'أحمد محمود',
    driver_name: 'الكابتن محمد علي',
    vehicle_info: 'هيونداي إلنترا - فضي ميتاليك (ل ق ر 9514)'
  }
];

let mockLocationUpdates: Record<string, LocationUpdate[]> = {};

export const mobilityApi = {
  /**
   * Fetch Driver Profile for a user
   */
  async getDriverProfile(userId: string): Promise<DriverProfile | null> {
    if (!isSupabaseConfigured()) {
      const found = mockDrivers.find(d => d.profile_id === userId);
      return found || null;
    }

    try {
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          *,
          profiles (
            full_name,
            phone_number
          )
        `)
        .eq('profile_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        driver_name: data.profiles?.full_name,
        driver_phone: data.profiles?.phone_number
      };
    } catch (e) {
      console.error('Error fetching driver profile:', e);
      return null;
    }
  },

  /**
   * Register as a Driver
   */
  async registerDriver(userId: string, nationalId: string, licenseNumber: string): Promise<DriverProfile> {
    if (!nationalId.trim() || !licenseNumber.trim()) {
      throw new Error('يرجى ملء كافة الحقول المطلوبة للهوية والرخصة.');
    }

    if (!isSupabaseConfigured()) {
      const existing = mockDrivers.find(d => d.profile_id === userId);
      if (existing) return existing;

      const newDriver: DriverProfile = {
        id: 'drv-' + Math.random().toString(36).substr(2, 9),
        profile_id: userId,
        national_id: nationalId,
        license_number: licenseNumber,
        approval_status: 'pending',
        is_online: false,
        rating_average: 5.0,
        created_at: new Date().toISOString()
      };
      mockDrivers.push(newDriver);
      return newDriver;
    }

    const { data, error } = await supabase
      .from('drivers')
      .insert({
        profile_id: userId,
        national_id: nationalId,
        license_number: licenseNumber,
        approval_status: 'pending',
        is_online: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error registering driver:', error);
      if (error.code === '23505') {
        throw new Error('رقم الهوية الوطنية أو رقم رخصة القيادة مسجل بالفعل في النظام.');
      }
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Add a vehicle for a driver
   */
  async addVehicle(driverId: string, vehicle: { make: string; model: string; year: number; plateNumber: string; color?: string }): Promise<Vehicle> {
    if (!vehicle.make || !vehicle.model || !vehicle.year || !vehicle.plateNumber) {
      throw new Error('يرجى كتابة كافة تفاصيل المركبة.');
    }

    if (vehicle.year < 2000) {
      throw new Error('عذراً، يجب أن يكون موديل سنة الصنع للمركبة 2000 أو أحدث.');
    }

    if (!isSupabaseConfigured()) {
      const newVehicle: Vehicle = {
        id: 'veh-' + Math.random().toString(36).substr(2, 9),
        driver_id: driverId,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        plate_number: vehicle.plateNumber,
        color: vehicle.color || null,
        is_active: true,
        created_at: new Date().toISOString()
      };
      mockVehicles.push(newVehicle);
      return newVehicle;
    }

    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        driver_id: driverId,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        plate_number: vehicle.plateNumber,
        color: vehicle.color || null,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding vehicle:', error);
      if (error.code === '23505') {
        throw new Error('لوحة السيارة هذه مسجلة بالفعل في النظام.');
      }
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Get vehicles registered under a driver
   */
  async getDriverVehicles(driverId: string): Promise<Vehicle[]> {
    if (!isSupabaseConfigured()) {
      return mockVehicles.filter(v => v.driver_id === driverId);
    }

    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting vehicles:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Update vehicle details
   */
  async updateVehicle(
    vehicleId: string,
    vehicle: {
      make: string;
      model: string;
      year: number;
      plateNumber: string;
      color?: string | null;
    }
  ): Promise<Vehicle> {
    if (!isSupabaseConfigured()) {
      const idx = mockVehicles.findIndex(v => v.id === vehicleId);
      if (idx !== -1) {
        mockVehicles[idx] = {
          ...mockVehicles[idx],
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          plate_number: vehicle.plateNumber,
          color: vehicle.color || null,
        };
        return mockVehicles[idx];
      }
      throw new Error('المركبة غير موجودة.');
    }

    const { data, error } = await supabase
      .from('vehicles')
      .update({
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        plate_number: vehicle.plateNumber,
        color: vehicle.color || null,
      })
      .eq('id', vehicleId)
      .select()
      .single();

    if (error) {
      console.error('Error updating vehicle:', error);
      if (error.code === '23505') {
        throw new Error('لوحة السيارة هذه مسجلة بالفعل في النظام.');
      }
      throw new Error(error.message || 'فشل تحديث بيانات المركبة.');
    }

    return data;
  },

  /**
   * Toggle vehicle active status
   */
  async toggleVehicleStatus(vehicleId: string, isActive: boolean): Promise<Vehicle> {
    if (!isSupabaseConfigured()) {
      const idx = mockVehicles.findIndex(v => v.id === vehicleId);
      if (idx !== -1) {
        mockVehicles[idx].is_active = isActive;
        return mockVehicles[idx];
      }
      throw new Error('المركبة غير موجودة.');
    }

    const { data, error } = await supabase
      .from('vehicles')
      .update({ is_active: isActive })
      .eq('id', vehicleId)
      .select()
      .single();

    if (error) {
      console.error('Error toggling vehicle status:', error);
      throw new Error(error.message || 'فشل تغيير حالة تفعيل المركبة.');
    }

    return data;
  },

  /**
   * Delete vehicle (if not referenced by historical rides)
   */
  async deleteVehicle(vehicleId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      const idx = mockVehicles.findIndex(v => v.id === vehicleId);
      if (idx !== -1) {
        mockVehicles.splice(idx, 1);
      }
      return;
    }

    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId);

    if (error) {
      console.error('Error deleting vehicle:', error);
      if (error.code === '23503') {
        throw new Error('لا يمكن حذف هذه المركبة لوجود رحلات سابقة مرتبطة بها. يمكنك تعطيلها بدلاً من الحذف.');
      }
      throw new Error(error.message || 'فشل حذف المركبة.');
    }
  },

  /**
   * Toggle driver online/offline status
   */
  async setDriverOnlineStatus(driverId: string, isOnline: boolean): Promise<void> {
    if (!isSupabaseConfigured()) {
      const index = mockDrivers.findIndex(d => d.id === driverId);
      if (index !== -1) {
        mockDrivers[index].is_online = isOnline;
      }
      return;
    }

    // 1. Verify Driver is Approved
    if (isOnline) {
      const { data: driverInfo, error: checkErr } = await supabase
        .from('drivers')
        .select('approval_status')
        .eq('id', driverId)
        .maybeSingle();
      
      if (checkErr || !driverInfo) {
        throw new Error('لا يمكن التحقق من حالة الكابتن.');
      }
      
      if (driverInfo.approval_status !== 'approved') {
        throw new Error('لا يمكنك الاتصال لأن حسابك غير معتمد بعد.');
      }
    }

    const { error } = await supabase
      .from('drivers')
      .update({ is_online: isOnline, updated_at: new Date().toISOString() })
      .eq('id', driverId);

    if (error) {
      console.error('Error updating online status:', error);
      throw new Error('فشل تحديث حالة الاتصال للكابتن.');
    }
  },

  /**
   * Request a Ride (Customer)
   */
  async requestRide(
    customerId: string,
    ride: {
      pickupText: string;
      pickupLat: number;
      pickupLng: number;
      dropoffText: string;
      dropoffLat: number;
      dropoffLng: number;
      estimatedFare: number;
    }
  ): Promise<Ride> {
    if (!isSupabaseConfigured()) {
      const newRide: Ride = {
        id: 'ride-' + Math.random().toString(36).substr(2, 9),
        customer_id: customerId,
        driver_id: null,
        vehicle_id: null,
        pickup_address_text: ride.pickupText,
        pickup_latitude: ride.pickupLat,
        pickup_longitude: ride.pickupLng,
        dropoff_address_text: ride.dropoffText,
        dropoff_latitude: ride.dropoffLat,
        dropoff_longitude: ride.dropoffLng,
        estimated_fare: ride.estimatedFare,
        final_fare: null,
        status: 'requested',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        customer_name: 'أنت الراكب'
      };
      mockRides.push(newRide);
      return newRide;
    }

    const { data, error } = await supabase
      .from('rides')
      .insert({
        customer_id: customerId,
        pickup_address_text: ride.pickupText,
        pickup_latitude: ride.pickupLat,
        pickup_longitude: ride.pickupLng,
        dropoff_address_text: ride.dropoffText,
        dropoff_latitude: ride.dropoffLat,
        dropoff_longitude: ride.dropoffLng,
        estimated_fare: ride.estimatedFare,
        status: 'requested'
      })
      .select()
      .single();

    if (error) {
      console.error('Error requesting ride:', error);
      throw new Error(`فشل إرسال طلب التوصيل: ${error.message}`);
    }

    return data;
  },

  /**
   * Cancel a ride
   */
  async cancelRide(rideId: string, profileId: string, reason: string = 'Cancelled by user'): Promise<void> {
    if (!isSupabaseConfigured()) {
      const index = mockRides.findIndex(r => r.id === rideId);
      if (index !== -1) {
        mockRides[index].status = 'cancelled';
        mockRides[index].updated_at = new Date().toISOString();
      }
      return;
    }

    // 1. Try secure RPC
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('cancel_ride', {
        p_ride_id: rideId,
        p_reason: reason
      });

      if (!rpcError && rpcData?.success) {
        return;
      }
      if (rpcError && rpcError.message && (
        rpcError.message.includes('لا يمكن إلغاء') ||
        rpcError.message.includes('Access Denied') ||
        rpcError.message.includes('not found')
      )) {
        throw new Error(rpcError.message);
      }
    } catch (e: any) {
      if (e.message && (
        e.message.includes('لا يمكن إلغاء') ||
        e.message.includes('Access Denied') ||
        e.message.includes('not found')
      )) {
        throw e;
      }
    }

    // 2. Direct update fallback
    const { error } = await supabase
      .from('rides')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', rideId);

    if (error) {
      console.error('Error cancelling ride:', error);
      throw new Error(`فشل إلغاء الرحلة: ${error.message}`);
    }
  },

  /**
   * Fetch Active Ride for Customer
   */
  async getActiveCustomerRide(customerId: string): Promise<Ride | null> {
    if (!isSupabaseConfigured()) {
      const active = mockRides.find(
        r => r.customer_id === customerId && r.status !== 'completed' && r.status !== 'cancelled'
      );
      if (!active) return null;
      
      // Inject relations in mock
      if (active.driver_id) {
        const d = mockDrivers.find(drv => drv.id === active.driver_id);
        const v = mockVehicles.find(veh => veh.driver_id === active.driver_id);
        if (d) {
          active.driver_name = d.driver_name;
          active.driver_phone = d.driver_phone;
        }
        if (v) {
          active.vehicle_info = `${v.make} ${v.model} - ${v.color} (${v.plate_number})`;
        }
      }
      return active;
    }

    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          driver:driver_id (
            id,
            rating_average,
            profiles (
              full_name,
              phone_number
            )
          ),
          vehicle:vehicle_id (
            make,
            model,
            plate_number,
            color
          )
        `)
        .eq('customer_id', customerId)
        .not('status', 'in', '("completed","cancelled")')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const driverProfile = data.driver?.profiles as any;
      const vehicleObj = data.vehicle as any;

      return {
        ...data,
        driver_name: driverProfile?.full_name,
        driver_phone: driverProfile?.phone_number,
        vehicle_info: vehicleObj ? `${vehicleObj.make} ${vehicleObj.model} - ${vehicleObj.color || ''} (${vehicleObj.plate_number})` : undefined
      };
    } catch (e) {
      console.error('Error getting active customer ride:', e);
      return null;
    }
  },

  /**
   * Fetch Active Ride for Driver
   */
  async getActiveDriverRide(driverId: string): Promise<Ride | null> {
    if (!isSupabaseConfigured()) {
      const active = mockRides.find(
        r => r.driver_id === driverId && r.status !== 'completed' && r.status !== 'cancelled'
      );
      if (!active) return null;
      return active;
    }

    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          profiles:customer_id (
            full_name,
            phone_number
          )
        `)
        .eq('driver_id', driverId)
        .not('status', 'in', '("completed","cancelled")')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const customerProfile = data.profiles as any;

      return {
        ...data,
        customer_name: customerProfile?.full_name,
        customer_phone: customerProfile?.phone_number
      };
    } catch (e) {
      console.error('Error getting active driver ride:', e);
      return null;
    }
  },

  /**
   * Fetch Available Rides for Drivers (status = 'requested')
   */
  async getAvailableRides(): Promise<Ride[]> {
    if (!isSupabaseConfigured()) {
      return mockRides.filter(r => r.status === 'requested');
    }

    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        profiles:customer_id (
          full_name,
          phone_number
        )
      `)
      .eq('status', 'requested')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting available rides:', error);
      return [];
    }

    return (data || []).map((item: any) => ({
      ...item,
      customer_name: item.profiles?.full_name,
      customer_phone: item.profiles?.phone_number
    }));
  },

  /**
   * Accept an available ride (with state validation to avoid duplicate acceptances)
   */
  async acceptRide(rideId: string, driverId: string, vehicleId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      const index = mockRides.findIndex(r => r.id === rideId && r.status === 'requested');
      if (index === -1) {
        throw new Error('عذراً، هذه الرحلة لم تعد متاحة أو تم قبولها بالفعل.');
      }
      mockRides[index].driver_id = driverId;
      mockRides[index].vehicle_id = vehicleId;
      mockRides[index].status = 'driver_assigned';
      mockRides[index].updated_at = new Date().toISOString();
      return;
    }

    // 1. Try atomic RPC for maximum security and race condition protection
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('driver_accept_ride', {
        p_ride_id: rideId,
        p_driver_id: driverId,
        p_vehicle_id: vehicleId
      });

      if (!rpcError && rpcData?.success) {
        return;
      }
      if (rpcError && rpcError.message && (
        rpcError.message.includes('غير متاحة') || 
        rpcError.message.includes('تم قبولها') || 
        rpcError.message.includes('not found') || 
        rpcError.message.includes('Access Denied') ||
        rpcError.message.includes('not approved')
      )) {
        throw new Error(rpcError.message);
      }
    } catch (e: any) {
      if (e.message && (
        e.message.includes('غير متاحة') || 
        e.message.includes('تم قبولها') ||
        e.message.includes('Access Denied') ||
        e.message.includes('not approved')
      )) {
        throw e;
      }
    }

    // 2. Direct atomic update fallback with status='requested' precondition
    const { data, error } = await supabase
      .from('rides')
      .update({
        driver_id: driverId,
        vehicle_id: vehicleId,
        status: 'driver_assigned',
        updated_at: new Date().toISOString()
      })
      .eq('id', rideId)
      .eq('status', 'requested')
      .select()
      .single(); // MUST currently be requested and single will throw if 0 rows updated

    if (error || !data) {
      console.error('Error accepting ride:', error);
      throw new Error('عذراً، هذه الرحلة لم تعد متاحة أو تم قبولها بالفعل من كابتن آخر.');
    }
  },

  /**
   * Advance ride status along the verified state machine
   */
  async updateRideStatus(rideId: string, newStatus: RideStatus, finalFare?: number): Promise<void> {
    if (!isSupabaseConfigured()) {
      const index = mockRides.findIndex(r => r.id === rideId);
      if (index !== -1) {
        mockRides[index].status = newStatus;
        if (finalFare !== undefined) {
          mockRides[index].final_fare = finalFare;
        }
        mockRides[index].updated_at = new Date().toISOString();
      }
      return;
    }

    const payload: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (finalFare !== undefined) {
      payload.final_fare = finalFare;
    }

    const { error } = await supabase
      .from('rides')
      .update(payload)
      .eq('id', rideId);

    if (error) {
      console.error('Error updating ride status:', error);
      throw new Error(`فشل تحديث حالة الرحلة: ${error.message}`);
    }
  },

  /**
   * Submit live location updates (Drivers only)
   */
  async sendLocationUpdate(rideId: string, driverId: string, latitude: number, longitude: number, heading: number = 0): Promise<void> {
    if (!isSupabaseConfigured()) {
      if (!mockLocationUpdates[rideId]) {
        mockLocationUpdates[rideId] = [];
      }
      mockLocationUpdates[rideId].push({
        id: Math.floor(Math.random() * 10000),
        ride_id: rideId,
        driver_id: driverId,
        latitude,
        longitude,
        heading,
        created_at: new Date().toISOString()
      });
      return;
    }

    const { error } = await supabase
      .from('ride_location_updates')
      .insert({
        ride_id: rideId,
        driver_id: driverId,
        latitude,
        longitude,
        heading
      });

    if (error) {
      console.error('Error inserting location update:', error);
    }
  },

  /**
   * Fetch the latest location update for a ride
   */
  async getLatestLocationUpdate(rideId: string): Promise<LocationUpdate | null> {
    if (!isSupabaseConfigured()) {
      const updates = mockLocationUpdates[rideId] || [];
      return updates.length > 0 ? updates[updates.length - 1] : null;
    }

    const { data, error } = await supabase
      .from('ride_location_updates')
      .select('*')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching location updates:', error);
      return null;
    }

    return data;
  },

  /**
   * Fetch Ride History for Customer
   */
  async getCustomerRideHistory(customerId: string): Promise<Ride[]> {
    if (!isSupabaseConfigured()) {
      return mockRides.filter(r => r.customer_id === customerId && (r.status === 'completed' || r.status === 'cancelled'));
    }

    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        driver:driver_id (
          profiles (
            full_name
          )
        )
      `)
      .eq('customer_id', customerId)
      .in('status', ['completed', 'cancelled'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer ride history:', error);
      return [];
    }

    return (data || []).map((item: any) => ({
      ...item,
      driver_name: item.driver?.profiles?.full_name
    }));
  },

  /**
   * Fetch Ride History for Driver
   */
  async getDriverRideHistory(driverId: string): Promise<Ride[]> {
    if (!isSupabaseConfigured()) {
      return mockRides.filter(r => r.driver_id === driverId && (r.status === 'completed' || r.status === 'cancelled'));
    }

    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        profiles:customer_id (
          full_name
        )
      `)
      .eq('driver_id', driverId)
      .in('status', ['completed', 'cancelled'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching driver ride history:', error);
      return [];
    }

    return (data || []).map((item: any) => ({
      ...item,
      customer_name: item.profiles?.full_name
    }));
  },

  /**
   * Fetch all rides for administrator monitoring
   */
  async getAllRidesForAdmin(): Promise<Ride[]> {
    if (!isSupabaseConfigured()) {
      return mockRides;
    }

    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        customer:customer_id (full_name, phone_number),
        driver:driver_id (profiles (full_name, phone_number)),
        vehicle:vehicle_id (make, model, plate_number)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching admin rides list:', error);
      return [];
    }

    return (data || []).map((r: any) => ({
      ...r,
      customer_name: r.customer?.full_name,
      customer_phone: r.customer?.phone_number,
      driver_name: r.driver?.profiles?.full_name,
      driver_phone: r.driver?.profiles?.phone_number,
      vehicle_info: r.vehicle ? `${r.vehicle.make} ${r.vehicle.model} (${r.vehicle.plate_number})` : undefined
    }));
  }
};
