// deno-lint-ignore no-explicit-any
const env = (k: string): string | undefined => (globalThis as any).Deno?.env?.get?.(k);
const num = (k: string, d: number) => {
  const v = Number(env(k));
  return Number.isFinite(v) && v > 0 ? v : d;
};

export const config = {
  scrapeTimeoutMs: num("SCRAPE_TIMEOUT_MS", 55_000),
  navigationTimeoutMs: num("NAVIGATION_TIMEOUT_MS", 45_000),
  renderWaitMs: num("RENDER_WAIT_MS", 1_500),
  maxPageSizeMb: num("MAX_PAGE_SIZE_MB", 8),
  maxContentLength: num("MAX_CONTENT_LENGTH", 400_000),
  maxScrollIterations: num("MAX_SCROLL_ITERATIONS", 4),
  maxRetries: num("MAX_RETRIES", 1),
  cacheTtlSeconds: num("CACHE_TTL_SECONDS", 3600),
  blockAds: env("BLOCK_ADS") !== "false",
};
