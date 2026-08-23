import {
  FieldTestDefinition,
  FieldTestResult,
  FieldTestSuiteReport,
  FieldTestExecutionContext,
  FieldTestStatus,
  FieldTestCategory,
} from './fieldTestTypes';
import { fieldTestRegistry } from './fieldTestRegistry';
import { calculateFieldTestScore, deriveFinalStatus } from './fieldTestUtils';

export interface FieldTestRunnerCallbacks {
  onSuiteStart?: (total: number) => void;
  onTestStart?: (test: FieldTestDefinition, index: number, total: number) => void;
  onTestComplete?: (result: FieldTestResult, index: number, total: number) => void;
  onSuiteComplete?: (report: FieldTestSuiteReport) => void;
  onLog?: (logLine: string) => void;
}

export class FieldTestRunner {
  private isRunning: boolean = false;
  private shouldAbort: boolean = false;

  public async runTests(
    testsToRun: FieldTestDefinition[],
    user: any,
    callbacks: FieldTestRunnerCallbacks = {}
  ): Promise<FieldTestSuiteReport> {
    if (this.isRunning) {
      throw new Error('Test runner is already executing. Please wait or stop first.');
    }

    this.isRunning = true;
    this.shouldAbort = false;

    const startedAt = new Date().toISOString();
    const startTime = performance.now();
    const results: FieldTestResult[] = [];
    const logs: string[] = [];

    const appendLog = (msg: string) => {
      const timeStr = new Date().toLocaleTimeString('ar-EG', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const line = `[${timeStr}] ${msg}`;
      logs.push(line);
      if (callbacks.onLog) {
        callbacks.onLog(line);
      }
    };

    const isDemoMode = import.meta.env.VITE_MOBILITY_DEMO_MODE === 'true';
    const allowMutations = import.meta.env.VITE_FIELD_TEST_ALLOW_MUTATIONS === 'true';
    const environment = (import.meta.env.MODE || 'development') as 'development' | 'production';
    const networkOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    appendLog(`بدء تشغيل مختبر اختبارات كفراوي Go (${testsToRun.length} اختبار)...`);
    appendLog(`البيئة: ${environment.toUpperCase()} | الطفرات: ${allowMutations ? 'مسموحة' : 'محمية ومحظورة 🛡️'}`);

    if (callbacks.onSuiteStart) {
      callbacks.onSuiteStart(testsToRun.length);
    }

    const context: FieldTestExecutionContext = {
      user,
      allowMutations,
      isDemoMode,
      environment,
      log: appendLog,
    };

    let index = 0;
    for (const test of testsToRun) {
      if (this.shouldAbort) {
        appendLog(`تم إيقاف تشغيل الاختبارات بواسطة المستخدم عند الاختبار [${test.id}].`);
        break;
      }

      index++;
      if (callbacks.onTestStart) {
        callbacks.onTestStart(test, index, testsToRun.length);
      }

      const testStart = performance.now();
      let outcome: { status: FieldTestStatus; message: string; details?: string; error?: string };

      try {
        outcome = await test.run(context);
      } catch (err: any) {
        outcome = {
          status: 'FAIL',
          message: 'حدث استثناء غير متوقع أثناء تنفيذ الاختبار.',
          error: err?.message || String(err),
        };
      }

      const durationMs = Math.round(performance.now() - testStart);

      const result: FieldTestResult = {
        id: test.id,
        name: test.name,
        category: test.category,
        status: outcome.status,
        message: outcome.message,
        details: outcome.details,
        error: outcome.error,
        durationMs,
        timestamp: new Date().toISOString(),
        environment,
        requiresRealDevice: test.requiresRealDevice,
        requiresRealtime: test.requiresRealtime,
        requiresDatabase: test.requiresDatabase,
      };

      results.push(result);

      const statusIcon =
        result.status === 'PASS'
          ? '🟢 PASS'
          : result.status === 'WARN'
          ? '🟡 WARN'
          : result.status === 'FAIL'
          ? '🔴 FAIL'
          : '⚪ SKIPPED';

      appendLog(`${test.id.padEnd(8, ' ')} ${test.name.substring(0, 32).padEnd(32, ' ')} ${statusIcon} (${durationMs}ms)`);

      if (callbacks.onTestComplete) {
        callbacks.onTestComplete(result, index, testsToRun.length);
      }
    }

    const durationTotalMs = Math.round(performance.now() - startTime);
    const completedAt = new Date().toISOString();

    const passed = results.filter((r) => r.status === 'PASS').length;
    const failed = results.filter((r) => r.status === 'FAIL').length;
    const warned = results.filter((r) => r.status === 'WARN').length;
    const skipped = results.filter((r) => r.status === 'SKIPPED').length;

    const score = calculateFieldTestScore(passed, failed, warned, skipped);
    const finalStatus = deriveFinalStatus(failed, warned);

    // Build category summary
    const categorySummary: Record<string, FieldTestStatus> = {};
    const categories: FieldTestCategory[] = fieldTestRegistry.getCategories();
    categories.forEach((cat) => {
      const catResults = results.filter((r) => r.category === cat);
      if (catResults.length === 0) return;
      if (catResults.some((r) => r.status === 'FAIL')) {
        categorySummary[cat] = 'FAIL';
      } else if (catResults.some((r) => r.status === 'WARN')) {
        categorySummary[cat] = 'WARN';
      } else if (catResults.every((r) => r.status === 'PASS')) {
        categorySummary[cat] = 'PASS';
      } else {
        categorySummary[cat] = 'SKIPPED';
      }
    });

    const report: FieldTestSuiteReport = {
      total: testsToRun.length,
      passed,
      failed,
      warned,
      skipped,
      score,
      finalStatus,
      results,
      categorySummary,
      logs,
      startedAt,
      completedAt,
      environment,
      networkOnline,
      mutationsAllowed: allowMutations,
      durationTotalMs,
    };

    appendLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    appendLog(`اكتملت الاختبارات بنجاح! النتيجة: ${score}% | الحالة: ${finalStatus}`);

    this.isRunning = false;
    this.shouldAbort = false;

    if (callbacks.onSuiteComplete) {
      callbacks.onSuiteComplete(report);
    }

    return report;
  }

  public stop(): void {
    if (this.isRunning) {
      this.shouldAbort = true;
    }
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }
}

export const fieldTestRunner = new FieldTestRunner();
