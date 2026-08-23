export type FieldTestStatus = 'PASS' | 'FAIL' | 'WARN' | 'SKIPPED';

export type FieldTestCategory =
  | 'AUTH'
  | 'GPS'
  | 'GEOCODING'
  | 'ROUTING'
  | 'ETA'
  | 'FARE'
  | 'RIDE'
  | 'CONCURRENCY'
  | 'STATE_MACHINE'
  | 'REALTIME'
  | 'LOCATION_STREAM'
  | 'SECURITY'
  | 'RATING'
  | 'AUDIT'
  | 'BUILD';

export interface FieldTestResult {
  id: string;
  name: string;
  category: FieldTestCategory;
  status: FieldTestStatus;
  message: string;
  details?: string;
  durationMs: number;
  timestamp: string;
  environment: 'development' | 'production';
  requiresRealDevice: boolean;
  requiresRealtime: boolean;
  requiresDatabase: boolean;
  error?: string;
}

export interface FieldTestExecutionContext {
  user: any;
  allowMutations: boolean;
  isDemoMode: boolean;
  environment: 'development' | 'production';
  log: (msg: string) => void;
}

export type FieldTestRunFn = (
  context: FieldTestExecutionContext
) => Promise<{
  status: FieldTestStatus;
  message: string;
  details?: string;
  error?: string;
}>;

export interface FieldTestDefinition {
  id: string;
  index: number;
  name: string;
  category: FieldTestCategory;
  description: string;
  requiresRealDevice: boolean;
  requiresRealtime: boolean;
  requiresDatabase: boolean;
  run: FieldTestRunFn;
}

export interface FieldTestSuiteReport {
  total: number;
  passed: number;
  failed: number;
  warned: number;
  skipped: number;
  score: number;
  finalStatus: 'FIELD TEST PASSED' | 'PASS WITH WARNINGS' | 'NOT READY';
  results: FieldTestResult[];
  categorySummary: Record<string, FieldTestStatus>;
  logs: string[];
  startedAt: string;
  completedAt: string;
  environment: 'development' | 'production';
  networkOnline: boolean;
  mutationsAllowed: boolean;
  durationTotalMs: number;
}
