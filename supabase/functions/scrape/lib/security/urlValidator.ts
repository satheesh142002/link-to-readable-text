import { ScrapeError } from "../types.ts";

const BLOCKED_HOSTNAMES = new Set([
  "localhost", "localhost.localdomain", "metadata.google.internal", "metadata",
  "instance-data", "kubernetes.default", "kubernetes.default.svc",
]);
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".intranet", ".lan", ".home.arpa"];

const TRACKING_PARAMS = [
  /^utm_/i, /^fbclid$/i, /^gclid$/i, /^dclid$/i, /^msclkid$/i, /^mc_(cid|eid)$/i,
  /^_hs(enc|mi)$/i, /^igshid$/i, /^yclid$/i, /^ref_src$/i, /^spm$/i, /^oly_(anon|enc)_id$/i,
];

export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return false;
  const [a, b] = parts;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local / cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast + reserved
  );
}

export function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (v === "::" || v === "::1") return true;
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  if (v.startsWith("::ffff:")) return true; // hex-form mapped addresses — reject conservatively
  return /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith("ff") || v.startsWith("64:ff9b:") || v.startsWith("2001:db8");
}

const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;

export function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTNAMES.has(h)) return true;
  if (BLOCKED_SUFFIXES.some((s) => h.endsWith(s))) return true;
  if (IPV4_RE.test(h)) return isPrivateIPv4(h);
  if (h.startsWith("[") || h.includes(":")) return isPrivateIPv6(h);
  // Numeric-only obfuscated hosts like "2130706433" or "0x7f000001"
  if (/^(0x[0-9a-f]+|\d+)$/i.test(h)) return true;
  if (!h.includes(".")) return true; // single-label hosts are internal
  return false;
}

/** Validate and normalize a user-supplied URL. Throws ScrapeError on failure. */
export function validateUrl(raw: string): URL {
  if (typeof raw !== "string" || !raw.trim()) throw new ScrapeError("INVALID_URL", "Please enter a URL.");
  let input = raw.trim();
  if (input.length > 2048) throw new ScrapeError("INVALID_URL", "That URL is too long.");
  if (/^(javascript|data|file|ftp|blob|about|chrome|view-source):/i.test(input)) {
    throw new ScrapeError("UNSUPPORTED_PROTOCOL", "Only http and https links are supported.");
  }
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(input)) input = `https://${input}`;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new ScrapeError("INVALID_URL", "That doesn't look like a valid web address.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ScrapeError("UNSUPPORTED_PROTOCOL", "Only http and https links are supported.");
  }
  if (url.username || url.password) throw new ScrapeError("INVALID_URL", "Links with embedded credentials are not allowed.");
  if (isBlockedHost(url.hostname)) {
    throw new ScrapeError("BLOCKED_DESTINATION", "That address points to a private or internal network and can't be loaded.");
  }
  if (url.port && !["80", "443", "8080", "8443"].includes(url.port)) {
    throw new ScrapeError("BLOCKED_DESTINATION", "Non-standard ports are not allowed.");
  }
  return url;
}

export function stripTracking(url: URL): URL {
  const u = new URL(url.toString());
  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING_PARAMS.some((re) => re.test(key))) u.searchParams.delete(key);
  }
  return u;
}

/** Canonical form used for cache keys. */
export function normalizeUrl(url: URL): string {
  const u = stripTracking(url);
  u.hash = "";
  u.hostname = u.hostname.toLowerCase();
  if ((u.protocol === "https:" && u.port === "443") || (u.protocol === "http:" && u.port === "80")) u.port = "";
  u.searchParams.sort();
  let s = u.toString();
  if (u.pathname !== "/" && s.endsWith("/") && !u.search) s = s.slice(0, -1);
  return s;
}
