// A minimal stand-in for the Drizzle client. Every query-builder chain resolves
// to the next value pushed with `queueResult` (or [] when the queue is empty).
const results: unknown[] = [];

export function queueResult(...values: unknown[]) {
  results.push(...values);
}

export function resetFakeDb() {
  results.length = 0;
}

function chain(): unknown {
  const target = () => undefined;
  return new Proxy(target, {
    get(_t, prop) {
      if (prop === 'then') {
        const value = results.length > 0 ? results.shift() : [];
        return (resolve: (v: unknown) => void) => resolve(value);
      }
      return () => chain();
    },
  });
}

export const fakeDb = new Proxy(
  {},
  {
    get: () => () => chain(),
  },
);
