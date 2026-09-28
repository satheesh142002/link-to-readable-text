const TRACKING = [/^utm_/i, /^fbclid$/i, /^gclid$/i, /^mc_(cid|eid)$/i, /^igshid$/i, /^_hs(enc|mi)$/i, /^ref_src$/i, /^msclkid$/i];

/** Resolve a (possibly relative) URL against a base and drop tracking params. Returns undefined for unsafe schemes. */
export function absolutize(href: string, base: string): string | undefined {
  const h = href.trim();
  if (!h || /^(javascript|data|vbscript|blob):/i.test(h)) return undefined;
  try {
    const u = new URL(h, base);
    if (!["http:", "https:", "mailto:"].includes(u.protocol)) return undefined;
    for (const key of [...u.searchParams.keys()]) if (TRACKING.some((re) => re.test(key))) u.searchParams.delete(key);
    return u.toString();
  } catch {
    return undefined;
  }
}
