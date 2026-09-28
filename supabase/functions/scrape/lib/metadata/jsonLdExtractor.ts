export type JsonLdNode = Record<string, unknown>;

function flatten(node: unknown, out: JsonLdNode[]) {
  if (Array.isArray(node)) {
    node.forEach((n) => flatten(n, out));
  } else if (node && typeof node === "object") {
    const obj = node as JsonLdNode;
    if (obj["@graph"]) flatten(obj["@graph"], out);
    if (obj["@type"]) out.push(obj);
  }
}

export function extractJsonLd(doc: Document): JsonLdNode[] {
  const out: JsonLdNode[] = [];
  doc.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    const raw = (s.textContent || "").trim();
    if (!raw) return;
    try {
      flatten(JSON.parse(raw), out);
    } catch {
      // Some sites emit invalid JSON (trailing commas / control chars) — try a light repair.
      try {
        flatten(JSON.parse(raw.replace(/[\u0000-\u001f]+/g, " ").replace(/,\s*([}\]])/g, "$1")), out);
      } catch { /* ignore */ }
    }
  });
  return out;
}

export function typesOf(node: JsonLdNode): string[] {
  const t = node["@type"];
  return (Array.isArray(t) ? t : [t]).filter((x): x is string => typeof x === "string");
}

const ARTICLE_TYPES = ["Article", "NewsArticle", "BlogPosting", "TechArticle", "Report", "ScholarlyArticle", "LiveBlogPosting"];

export function findPrimary(nodes: JsonLdNode[]): JsonLdNode | undefined {
  return (
    nodes.find((n) => typesOf(n).some((t) => ARTICLE_TYPES.includes(t))) ||
    nodes.find((n) => typesOf(n).some((t) => ["Product", "FAQPage", "HowTo", "QAPage", "DiscussionForumPosting"].includes(t))) ||
    nodes.find((n) => typesOf(n).includes("WebPage"))
  );
}

export function str(v: unknown): string | undefined {
  if (typeof v === "string") return v.trim() || undefined;
  if (Array.isArray(v)) return v.map(str).filter(Boolean).join(", ") || undefined;
  if (v && typeof v === "object") {
    const o = v as JsonLdNode;
    return str(o.name) || str(o["@value"]) || str(o.url);
  }
  return undefined;
}
