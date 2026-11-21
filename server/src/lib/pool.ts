/** Run async work with a fixed number of workers. */
export async function mapWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  let index = 0;
  const run = async (): Promise<void> => {
    while (index < items.length) {
      const current = index;
      index += 1;
      const item = items[current];
      if (item !== undefined) await worker(item);
    }
  };
  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => run()));
}
