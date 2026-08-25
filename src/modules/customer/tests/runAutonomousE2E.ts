import { autonomousE2ERunner } from './autonomousE2ERunner';

async function main() {
  console.log('\n🚀 Starting Kafrawy Go Autonomous E2E Test Suite...\n');
  
  const report = await autonomousE2ERunner.runSuite(undefined, {
    onLog: (line) => console.log(line),
  });

  console.log('\n' + autonomousE2ERunner.generateHumanReadableReport(report));
  
  if (report.summary.failed > 0 || report.summary.blocked > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal execution failure in E2E Test Agent:', err);
  process.exit(1);
});
