import { FieldTestSuiteReport } from './fieldTestTypes';
import { generateTextReport } from './fieldTestUtils';

export class FieldTestReportExporter {
  /**
   * Copy plain text ASCII report to clipboard
   */
  public static async copyToClipboard(report: FieldTestSuiteReport): Promise<boolean> {
    const text = generateTextReport(report);
    try {
      if (navigator && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Export report as clean JSON string
   */
  public static toJSONString(report: FieldTestSuiteReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export report as a standalone styled HTML document for QA archiving
   */
  public static toHTMLDocument(report: FieldTestSuiteReport): string {
    const statusColor =
      report.finalStatus === 'FIELD TEST PASSED'
        ? '#10b981'
        : report.finalStatus === 'PASS WITH WARNINGS'
        ? '#f59e0b'
        : '#ef4444';

    const testRows = report.results
      .map((r) => {
        const bg =
          r.status === 'PASS'
            ? '#ecfdf5'
            : r.status === 'WARN'
            ? '#fffbeb'
            : r.status === 'FAIL'
            ? '#fef2f2'
            : '#f3f4f6';
        const color =
          r.status === 'PASS'
            ? '#059669'
            : r.status === 'WARN'
            ? '#d97706'
            : r.status === 'FAIL'
            ? '#dc2626'
            : '#6b7280';

        return `
        <tr style="border-bottom: 1px solid #e5e7eb; background: ${bg}">
          <td style="padding: 10px; font-weight: bold;">${r.id}</td>
          <td style="padding: 10px;">${r.name}</td>
          <td style="padding: 10px; font-weight: bold; color: ${color};">${r.status}</td>
          <td style="padding: 10px;">${r.durationMs}ms</td>
          <td style="padding: 10px; font-size: 13px;">${r.message || ''} ${
          r.details ? `<br><small style="color:#6b7280">${r.details}</small>` : ''
        } ${r.error ? `<br><small style="color:#dc2626">${r.error}</small>` : ''}</td>
        </tr>
      `;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير اختبارات كفراوي Go الميدانية</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 24px; }
    .card { background: white; border-radius: 12px; padding: 24px; max-width: 900px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
    .badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-weight: bold; color: white; background: ${statusColor}; }
    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
    .metric { background: #f1f5f9; padding: 12px; border-radius: 8px; text-align: center; }
    .metric-value { font-size: 24px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; text-align: right; }
    th { background: #f8fafc; padding: 12px; border-bottom: 2px solid #cbd5e1; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>🚗 تقرير اختبارات Kafrawy Go الميدانية</h1>
      <p>البيئة: <strong>${report.environment.toUpperCase()}</strong> | التاريخ: <strong>${new Date(
      report.startedAt
    ).toLocaleString('ar-EG')}</strong></p>
      <div class="badge">${report.finalStatus} - النتيجة: ${report.score}%</div>
    </div>
    
    <div class="metrics-grid">
      <div class="metric"><div class="metric-value" style="color:#059669">${report.passed}</div><div>ناجح 🟢</div></div>
      <div class="metric"><div class="metric-value" style="color:#dc2626">${report.failed}</div><div>فاشل 🔴</div></div>
      <div class="metric"><div class="metric-value" style="color:#d97706">${report.warned}</div><div>تحذير 🟡</div></div>
      <div class="metric"><div class="metric-value" style="color:#6b7280">${report.skipped}</div><div>متخطى ⚪</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th>المعرف</th>
          <th>اسم الاختبار</th>
          <th>الحالة</th>
          <th>المدة</th>
          <th>الملاحظات والتفاصيل</th>
        </tr>
      </thead>
      <tbody>
        ${testRows}
      </tbody>
    </table>
  </div>
</body>
</html>`;
  }

  /**
   * Trigger download of a file in browser
   */
  public static downloadFile(filename: string, content: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
