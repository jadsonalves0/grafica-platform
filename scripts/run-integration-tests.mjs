const suites = [
  {
    name: "inventory-fifo",
    modulePath: "../tests/integration/inventory-fifo.test.mjs",
  },
  {
    name: "order-billing",
    modulePath: "../tests/integration/order-billing.test.mjs",
  },
  {
    name: "inventory-xml-import",
    modulePath: "../tests/integration/inventory-xml-import.test.mjs",
  },
  {
    name: "purchase-suggestions",
    modulePath: "../tests/integration/purchase-suggestions.test.mjs",
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

  if (typeof loadedSuite.afterAll === "function") {
    await loadedSuite.afterAll();
  }
}

if (failureCount > 0) {
  process.exitCode = 1;
} else {
  console.log(`Sucesso: ${suites.length} suite(s) de integracao executadas sem falhas.`);
}
