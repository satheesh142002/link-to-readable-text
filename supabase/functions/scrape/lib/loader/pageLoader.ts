// Page loader: renders the page in a remote headless Chromium (Firecrawl) with
// JavaScript execution, controlled waits and incremental scrolling, then returns
// the fully rendered DOM HTML. Deno-only.
import { config } from "../config.ts";
import { ScrapeError } from "../types.ts";

const GATEWAY = "https://connector-gateway.lovable.dev/firecrawl/v2";

export interface LoadedPage {
  html: string;
  finalUrl: string;
  status?: number;
  loadMs: number;
  retries: number;
}

function buildActions(scroll: boolean) {
  const actions: Record<string, unknown>[] = [{ type: "wait", milliseconds: config.renderWaitMs }];
  if (scroll) {
    for (let i = 0; i < config.maxScrollIterations; i++) {
      actions.push({ type: "scroll", direction: "down" });
      actions.push({ type: "wait", milliseconds: 600 });
    }
    actions.push({ type: "scroll", direction: "up" });
  }
  return actions;
}

async function callFirecrawl(url: string, scroll: boolean, signal: AbortSignal) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!lovableKey || !fcKey) throw new ScrapeError("INTERNAL_ERROR", "The page loader is not configured.", 500);

  return await fetch(`${GATEWAY}/scrape`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": fcKey,
    },
    body: JSON.stringify({
      url,
      formats: ["rawHtml"],
      onlyMainContent: false,
      timeout: config.navigationTimeoutMs,
      blockAds: config.blockAds,
      removeBase64Images: true,
      actions: buildActions(scroll),
    }),
  });
}

export async function loadPage(url: string): Promise<LoadedPage> {
  const started = Date.now();
  let retries = 0;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.scrapeTimeoutMs);
    try {
      // First attempt scrolls to trigger lazy content; the retry is lighter.
      const res = await callFirecrawl(url, attempt === 0, controller.signal);
      const bodyText = await res.text();
      if (!res.ok) {
        console.error(`Page loader failed [${res.status}]: ${bodyText.slice(0, 500)}`);
        if (res.status === 402 || (res.status === 403 && bodyText.includes("Credit limit"))) {
          throw new ScrapeError("UPSTREAM_ERROR", "The page-rendering service has run out of credits.", 402);
        }
        if (res.status === 408) throw new ScrapeError("NAVIGATION_TIMEOUT", "The page took too long to load.", 504);
        if (res.status >= 500 || res.status === 429) {
          lastErr = new ScrapeError("UPSTREAM_ERROR", "The page-rendering service is temporarily unavailable.", 502);
          retries++;
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }
        throw new ScrapeError("UPSTREAM_ERROR", "The page could not be rendered.", 502);
      }
      const json = JSON.parse(bodyText);
      const data = json.data ?? json;
      const meta = data.metadata ?? {};
      const status: number | undefined = meta.statusCode;
      const html: string = data.rawHtml ?? data.html ?? "";
      if (status === 404 || status === 410) throw new ScrapeError("PAGE_NOT_FOUND", "The page returned 'not found'.", 404);
      if (status === 401 || status === 403) throw new ScrapeError("ACCESS_DENIED", "The website denied access to this page.", 403);
      if (!html.trim()) throw new ScrapeError("EMPTY_CONTENT", "The page loaded but returned no content.", 422);
      if (html.length > config.maxPageSizeMb * 1024 * 1024) {
        throw new ScrapeError("TOO_LARGE", "This page is too large to process.", 413);
      }
      return {
        html,
        finalUrl: meta.url || meta.sourceURL || url,
        status,
        loadMs: Date.now() - started,
        retries,
      };
    } catch (e) {
      if (e instanceof ScrapeError) throw e;
      if ((e as Error).name === "AbortError") {
        throw new ScrapeError("SCRAPE_TIMEOUT", "Loading the page took too long.", 504);
      }
      lastErr = e;
      retries++;
    } finally {
      clearTimeout(timer);
    }
  }
  if (lastErr instanceof ScrapeError) throw lastErr;
  throw new ScrapeError("UPSTREAM_ERROR", "The page could not be loaded.", 502);
}
