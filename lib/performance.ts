// Opt-in diagnostics. Only fixed operation names, random trace IDs, durations
// and HTTP statuses are logged; never URLs, query strings, bodies or errors.
export function createPerformanceTrace(scope: string) {
  const enabled = process.env.PERF_REQUESTS === '1';
  const trace = enabled ? crypto.randomUUID() : '';
  const started = performance.now();
  function record(operation: string, start: number, status?: number) {
    if (enabled)
      console.info(
        JSON.stringify({
          type: 'request-performance',
          scope,
          trace,
          operation,
          duration_ms: Number((performance.now() - start).toFixed(2)),
          ...(status === undefined ? {} : { status }),
        }),
      );
  }
  return {
    record,
    finish: () => record('total', started),
    async measure<T>(operation: string, work: () => T | PromiseLike<T>): Promise<T> {
      if (!enabled) return await work();
      const start = performance.now();
      try {
        return await work();
      } finally {
        record(operation, start);
      }
    },
    fetch: (async (input, init) => {
      if (!enabled) return fetch(input, init);
      const start = performance.now();
      // Classify paths without logging identifiers or any query parameters.
      const path = new URL(input instanceof Request ? input.url : String(input)).pathname;
      const operation = path.startsWith('/auth/')
        ? 'http.auth'
        : path === '/rest/v1/deleted_jobs'
          ? 'http.deletedJobs'
          : path === '/rest/v1/rpc/get_expired_job'
            ? 'http.expiredJob'
            : path.startsWith('/rest/v1/profiles')
              ? 'http.profiles'
              : path.startsWith('/rest/v1/jobs')
                ? 'http.jobs'
                : path.startsWith('/rest/v1/categories')
                  ? 'http.categories'
                  : 'http.other';
      let status: number | undefined;
      try {
        const response = await fetch(input, init);
        status = response.status;
        return response;
      } finally {
        record(operation, start, status);
      }
    }) as typeof fetch,
  };
}
