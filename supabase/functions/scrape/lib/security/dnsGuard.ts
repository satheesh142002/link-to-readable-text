// Deno-only: resolves a hostname and rejects any that point at private infrastructure.
import { isPrivateIPv4, isPrivateIPv6, isBlockedHost } from "./urlValidator.ts";
import { ScrapeError } from "../types.ts";

export async function assertPublicHost(hostname: string): Promise<void> {
  if (isBlockedHost(hostname)) {
    throw new ScrapeError("BLOCKED_DESTINATION", "That address points to a private or internal network.");
  }
  const results: string[] = [];
  for (const type of ["A", "AAAA"] as const) {
    try {
      // deno-lint-ignore no-explicit-any
      const recs = await (Deno as any).resolveDns(hostname, type);
      results.push(...recs);
    } catch {
      /* no records of this type */
    }
  }
  if (results.length === 0) throw new ScrapeError("INVALID_URL", "That website's domain could not be found.");
  for (const ip of results) {
    if (ip.includes(":") ? isPrivateIPv6(ip) : isPrivateIPv4(ip)) {
      throw new ScrapeError("BLOCKED_DESTINATION", "That domain resolves to a private network address.");
    }
  }
}
