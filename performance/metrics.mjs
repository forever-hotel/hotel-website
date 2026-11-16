export const percentile = (values, fraction) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
};

export class Metrics {
  groups = new Map();
  record(name, { ms, bytes = 0, status = 0, error = false, timeout = false }) {
    const group = this.groups.get(name) || {
      durations: [],
      bytes: 0,
      errors: 0,
      timeouts: 0,
      statuses: {},
    };
    group.durations.push(ms);
    group.bytes += bytes;
    group.errors += Number(error);
    group.timeouts += Number(timeout);
    group.statuses[status] = (group.statuses[status] || 0) + 1;
    this.groups.set(name, group);
  }
  summarize(targets) {
    return Object.fromEntries(
      [...this.groups].map(([name, group]) => {
        const requests = group.durations.length;
        const p95Ms = percentile(group.durations, 0.95);
        const errorRate = group.errors / requests;
        return [
          name,
          {
            requests,
            errors: group.errors,
            errorRate,
            timeouts: group.timeouts,
            statuses: group.statuses,
            bytes: group.bytes,
            meanBytes: group.bytes / requests,
            p50Ms: percentile(group.durations, 0.5),
            p95Ms,
            p99Ms: percentile(group.durations, 0.99),
            maxMs: group.durations.reduce(
              (maximum, value) => Math.max(maximum, value),
              0,
            ),
            passed: p95Ms <= targets.p95Ms && errorRate <= targets.maxErrorRate,
          },
        ];
      }),
    );
  }
}
