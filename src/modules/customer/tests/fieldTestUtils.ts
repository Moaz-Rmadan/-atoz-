import { FieldTestResult, FieldTestSuiteReport, FieldTestStatus } from './fieldTestTypes';

/**
 * Calculates overall test suite score based on strict requirements:
 * PASS = 100%
 * WARN = 70%
 * SKIPPED = does not penalize score
 * FAIL = 0%
 */
export function calculateFieldTestScore(
  passed: number,
  failed: number,
  warned: number,
  _skipped: number
): number {
  const evaluated = passed + failed + warned;
  if (evaluated === 0) return 100;
  const rawScore = (passed * 100 + warned * 70) / evaluated;
  return Number(rawScore.toFixed(1));
}

/**
 * Derives final status from test results
 */
export function deriveFinalStatus(
  failed: number,
  warned: number
): 'FIELD TEST PASSED' | 'PASS WITH WARNINGS' | 'NOT READY' {
  if (failed > 0) return 'NOT READY';
  if (warned > 0) return 'PASS WITH WARNINGS';
  return 'FIELD TEST PASSED';
}

/**
 * Generates an ASCII/Unicode Text summary report
 */
export function generateTextReport(report: FieldTestSuiteReport): string {
  const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  const lines: string[] = [];

  lines.push('KAFRAWY GO');
  lines.push('FIELD TEST REPORT');
  lines.push(divider);
  lines.push(`ENVIRONMENT   : ${report.environment.toUpperCase()}`);
  lines.push(`MUTATIONS     : ${report.mutationsAllowed ? 'ALLOWED' : 'BLOCKED (SAFETY GUARD)'}`);
  lines.push(`NETWORK       : ${report.networkOnline ? 'ONLINE 🟢' : 'OFFLINE 🔴'}`);
  lines.push(`STARTED AT    : ${report.startedAt}`);
  lines.push(`COMPLETED AT  : ${report.completedAt}`);
  lines.push(`TOTAL DURATION: ${(report.durationTotalMs / 1000).toFixed(2)}s`);
  lines.push(divider);
  lines.push(`TOTAL         ${String(report.total).padStart(4, ' ')}`);
  lines.push(`PASS          ${String(report.passed).padStart(4, ' ')} 🟢`);
  lines.push(`FAIL          ${String(report.failed).padStart(4, ' ')} 🔴`);
  lines.push(`WARN          ${String(report.warned).padStart(4, ' ')} 🟡`);
  lines.push(`SKIPPED       ${String(report.skipped).padStart(4, ' ')} ⚪`);
  lines.push(`SCORE         ${String(report.score).padStart(4, ' ')}%`);
  lines.push(divider);
  lines.push('CATEGORY AUDIT:');
  Object.entries(report.categorySummary).forEach(([cat, status]) => {
    const icon = status === 'PASS' ? '🟢' : status === 'WARN' ? '🟡' : status === 'FAIL' ? '🔴' : '⚪';
    lines.push(`${cat.padEnd(16, ' ')} ${icon} ${status}`);
  });
  lines.push(divider);
  lines.push('DETAILED TEST BREAKDOWN:');
  report.results.forEach((r) => {
    const icon = r.status === 'PASS' ? '🟢' : r.status === 'WARN' ? '🟡' : r.status === 'FAIL' ? '🔴' : '⚪';
    lines.push(`[${r.id}] ${r.name.padEnd(28, ' ')} ${icon} ${r.status} (${r.durationMs}ms)`);
    if (r.message) lines.push(`     ↳ ${r.message}`);
    if (r.details) lines.push(`     ↳ Details: ${r.details}`);
    if (r.error) lines.push(`     ↳ Error: ${r.error}`);
  });
  lines.push(divider);
  lines.push('FINAL STATUS:');
  lines.push(
    report.finalStatus === 'FIELD TEST PASSED'
      ? '🟢 READY FOR CONTROLLED FIELD TEST'
      : report.finalStatus === 'PASS WITH WARNINGS'
      ? '🟡 PASS WITH WARNINGS'
      : '🔴 NOT READY'
  );
  lines.push(divider);

  return lines.join('\n');
}

/**
 * Calculates Euclidean / Haversine straight-line distance in kilometers
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(3));
}

/**
 * Safe execution wrapper ensuring timeouts and non-crashing tests
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}
