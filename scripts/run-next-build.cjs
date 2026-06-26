#!/usr/bin/env node
"use strict";

function patchNextWorkerForSingleProcessBuild() {
  const workerModulePath = require.resolve("next/dist/lib/worker");
  const originalWorkerModule = require(workerModulePath);

  class InProcessWorker {
    constructor(workerPath, options) {
      this._workerModule = require(workerPath);
      this._options = options;

      for (const method of options.exposedMethods || []) {
        if (method.startsWith("_")) {
          continue;
        }

        const target = this._workerModule[method];

        if (typeof target !== "function") {
          continue;
        }

        this[method] = async (...args) => {
          this._options.onActivity?.();
          return await target(...args);
        };
      }
    }

    async end() {
      return;
    }

    close() {}
  }

  require.cache[workerModulePath].exports = {
    ...originalWorkerModule,
    Worker: InProcessWorker,
  };
}

async function main() {
  console.log("Using in-process Next build fallback.");
  patchNextWorkerForSingleProcessBuild();

  const { nextBuild } = require("next/dist/cli/next-build");

  await nextBuild(
    {
      debug: false,
      debugPrerender: false,
      experimentalDebugMemoryUsage: false,
      profile: false,
      lint: true,
      mangling: true,
      experimentalAppOnly: false,
      experimentalBuildMode: "default",
      experimentalUploadTrace: undefined,
      turbo: false,
      turbopack: false,
    },
    process.cwd(),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
