export type E2ETestStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_VERIFIED';

export type E2ETestCategory =
  | 'CUSTOMER'
  | 'DRIVER'
  | 'DISPATCH'
  | 'MATCHING'
  | 'RACE_CONDITION'
  | 'GPS'
  | 'REALTIME'
  | 'STATE_MACHINE'
  | 'CASH'
  | 'FINANCIAL_SPLIT'
  | 'NOTIFICATIONS'
  | 'ADMIN'
  | 'SECURITY'
  | 'AUDIT'
  | 'BUILD';

export interface E2ETestEvidence {
  testId: string;
  name: string;
  category: E2ETestCategory;
  startTime: string;
  endTime: string;
  durationMs: number;
  expected: string;
  actual: string;
  status: E2ETestStatus;
  rideId?: string;
  dispatchId?: string;
  driverId?: string;
  customerId?: string;
  correlationId: string;
  error?: string;
  details?: Record<string, any>;
  logs: string[];
}

export interface E2ETestContext {
  correlationId: string;
  environment: 'STAGING' | 'TEST' | 'PREVIEW';
  testUsers: {
    customer: {
      id: string;
      fullName: string;
      phoneNumber: string;
      pickupCoords: { lat: number; lng: number; address: string };
      dropoffCoords: { lat: number; lng: number; address: string };
    };
    driverA: {
      id: string;
      profileId: string;
      fullName: string;
      phoneNumber: string;
      coords: { lat: number; lng: number };
      approvalStatus: string;
      isOnline: boolean;
    };
    driverB: {
      id: string;
      profileId: string;
      fullName: string;
      phoneNumber: string;
      coords: { lat: number; lng: number };
      approvalStatus: string;
      isOnline: boolean;
    };
    admin: {
      id: string;
      fullName: string;
      role: string;
    };
  };
  log: (msg: string) => void;
}

export interface E2ETestCase {
  id: string;
  num: number;
  name: string;
  category: E2ETestCategory;
  description: string;
  requiresRealDevice?: boolean;
  run: (ctx: E2ETestContext) => Promise<{
    status: E2ETestStatus;
    expected: string;
    actual: string;
    rideId?: string;
    dispatchId?: string;
    details?: Record<string, any>;
    error?: string;
  }>;
}

export interface E2ETestSuiteReport {
  testRunId: string;
  environment: 'STAGING' | 'TEST' | 'PREVIEW';
  startedAt: string;
  completedAt: string;
  durationTotalMs: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    notVerified: number;
  };
  categoryStatus: Record<string, 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_VERIFIED'>;
  buildStatus: {
    typeScript: 'PASS' | 'FAIL';
    productionBuild: 'PASS' | 'FAIL';
  };
  realDeviceTestStatus: 'NOT_VERIFIED';
  finalVerdict: 'READY FOR INTERNAL TEST' | 'READY FOR FIELD DEVICE TEST' | 'READY FOR LIMITED CASH PILOT' | 'NOT READY';
  evidences: E2ETestEvidence[];
  logs: string[];
}
