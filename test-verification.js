import { verifyEmail } from './backend/src/services/emailVerifier.js';

const testCases = [
  { email: 'akash@connektx.com', expected: 'catch-all' },
  { email: 'contact@techwaveventures.in', expected: 'catch-all' },
  { email: 'akashjare09@gmail.com', expected: 'valid' },
  { email: 'akashjare316@gmail.com', expected: 'valid' },
  { email: 'techwaveventures@gmail.com', expected: 'valid' },
  { email: 'techwavevntures1234@gmail.com', expected: 'invalid' },
  { email: 'something@tempmail.com', expected: 'invalid' }
];

async function runTests() {
  let passCount = 0;
  let failCount = 0;
  let iteration = 1;

  while (true) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`ITERATION ${iteration} - ${new Date().toLocaleTimeString()}`);
    console.log(`${'='.repeat(80)}\n`);

    for (const testCase of testCases) {
      const result = await verifyEmail(testCase.email);
      const passed = result.status === testCase.expected;

      if (passed) {
        console.log(`✅ PASS: ${testCase.email}`);
        console.log(`   Expected: ${testCase.expected}, Got: ${result.status}\n`);
        passCount++;
      } else {
        console.log(`❌ FAIL: ${testCase.email}`);
        console.log(`   Expected: ${testCase.expected}, Got: ${result.status}`);
        console.log(`   Reason: ${result.reason || 'N/A'}`);
        console.log(`   Full result:`, JSON.stringify(result, null, 2));
        console.log();
        failCount++;
      }
    }

    console.log(`${'='.repeat(80)}`);
    console.log(`SUMMARY - Iteration ${iteration}`);
    console.log(`Passed: ${passCount}/${testCases.length}`);
    console.log(`Failed: ${failCount}/${testCases.length}`);
    console.log(`Pass Rate: ${((passCount / testCases.length) * 100).toFixed(1)}%`);
    console.log(`${'='.repeat(80)}`);

    // Check if all passed
    if (failCount === 0) {
      console.log(`\n🎉 ALL TESTS PASSED! Stopping loop.`);
      break;
    }

    // Wait 5 seconds before next iteration
    console.log(`\nWaiting 5 seconds before next iteration...\n`);
    await new Promise(resolve => setTimeout(resolve, 5000));

    iteration++;
    passCount = 0;
    failCount = 0;
  }
}

runTests().catch(console.error);
