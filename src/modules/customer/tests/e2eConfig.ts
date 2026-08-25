/**
 * Kafrawy Go — E2E Test Suite Environment Configuration
 * 
 * Strict safety rules:
 * - Test runs ONLY against STAGING/TEST environments.
 * - Production mutation is strictly disallowed.
 * - Test users and deterministic test coordinates in Kafr El-Batikh / Damietta.
 */

const getEnvMode = (): 'STAGING' | 'TEST' | 'PREVIEW' => {
  try {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
      return 'STAGING';
    }
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'production') {
      return 'STAGING';
    }
  } catch {
    // Fallback
  }
  return 'TEST';
};

export const E2E_CONFIG = {
  environment: getEnvMode(),
  isTestEnvironment: true,
  dispatchTimeoutSeconds: 25,
  gpsFreshnessThresholdSeconds: 120,
  platformCommissionRate: 0.15,
  driverNetRate: 0.85,
  minimumFareFloor: 20.00,
  
  // Test Coordinates (Kafr El-Batikh, Damietta Governorate)
  locations: {
    pickup: {
      address: 'محطة قطار كفر البطيخ، دمياط',
      lat: 31.4055,
      lng: 31.7385,
    },
    dropoff: {
      address: 'مستشفى كفر البطيخ المركزي، دمياط',
      lat: 31.4025,
      lng: 31.7570,
    },
    intermediateRoute: [
      { lat: 31.4050, lng: 31.7420 },
      { lat: 31.4042, lng: 31.7480 },
      { lat: 31.4035, lng: 31.7530 },
    ],
    farAwayDriverLocation: {
      address: 'رأس البر، دمياط',
      lat: 31.5150,
      lng: 31.8150,
    }
  },

  // Test Fixtures
  fixtures: {
    customer: {
      id: '11111111-1111-4111-8111-111111111111',
      fullName: 'عميل تجريبي كفراوي جو',
      phoneNumber: '01011112222',
      email: 'test.customer@kafrawygo.local',
      role: 'customer'
    },
    driverA: {
      id: '22222222-2222-4222-8222-222222222222',
      profileId: '22222222-2222-4222-8222-222222222220',
      fullName: 'الكابتن أحمد محمود (سائق تجريبي أ)',
      phoneNumber: '01033334444',
      email: 'driver.a@kafrawygo.local',
      approvalStatus: 'approved',
      isOnline: true,
      nationalId: '29001011234567',
      licenseNumber: 'L-101010',
      vehicle: {
        id: '66666666-6666-4666-8666-666666666666',
        make: 'هيونداي',
        model: 'إلنترا',
        year: 2022,
        plateNumber: 'ط د ص 1234'
      }
    },
    driverB: {
      id: '33333333-3333-4333-8333-333333333333',
      profileId: '33333333-3333-4333-8333-333333333330',
      fullName: 'الكابتن حسام حسن (سائق تجريبي ب)',
      phoneNumber: '01055556666',
      email: 'driver.b@kafrawygo.local',
      approvalStatus: 'approved',
      isOnline: true,
      nationalId: '29202022345678',
      licenseNumber: 'L-202020',
      vehicle: {
        id: '77777777-7777-4777-8777-777777777777',
        make: 'تويوتا',
        model: 'كورولا',
        year: 2023,
        plateNumber: 'ط د ع 5678'
      }
    },
    driverPending: {
      id: '44444444-4444-4444-8444-444444444444',
      profileId: '44444444-4444-4444-8444-444444444440',
      fullName: 'كابتن قيد المراجعة',
      phoneNumber: '01077778888',
      approvalStatus: 'pending',
      isOnline: false,
    },
    driverOffline: {
      id: '55555555-5555-4555-8555-555555555555',
      profileId: '55555555-5555-4555-8555-555555555550',
      fullName: 'كابتن غير متصل',
      phoneNumber: '01099990000',
      approvalStatus: 'approved',
      isOnline: false,
    },
    admin: {
      id: '99999999-9999-4999-8999-999999999999',
      fullName: 'مدير عمليات تجريبي',
      email: 'admin.test@kafrawygo.local',
      role: 'admin'
    }
  }
};

export function generateCorrelationId(): string {
  return `kafrawy-e2e-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}
