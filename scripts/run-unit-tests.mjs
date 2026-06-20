const suites = [
  {
    name: "br-utils",
    modulePath: "../tests/unit/br-utils.test.mjs",
  },
];

let failureCount = 0;

for (const suite of suites) {
  const loadedSuite = await import(suite.modulePath);
  const cases = loadedSuite.cases ?? [];

  for (const testCase of cases) {
    try {
      await testCase.run();
      console.log(`ok - ${suite.name} - ${testCase.name}`);
    } catch (error) {
      failureCount += 1;
      console.error(`fail - ${suite.name} - ${testCase.name}`);
      console.error(error instanceof Error ? error.message : error);
    }
  }
}

if (failureCount > 0) {
  process.exitCode = 1;
} else {
  console.log(`Sucesso: ${suites.length} suite(s) executadas sem falhas.`);
}
