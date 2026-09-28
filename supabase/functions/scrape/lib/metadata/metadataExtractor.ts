import type { Metadata } from "../types.ts";
import { extractJsonLd, findPrimary, str, typesOf, type JsonLdNode } from "./jsonLdExtractor.ts";
import { absolutize } from "../utils/urls.ts";

function metaContent(doc: Document, attr: "name" | "property" | "itemprop", key: string): string | undefined {
  const el = doc.querySelector(`meta[${attr}="${key}" i]`);
  return el?.getAttribute("content")?.trim() || undefined;
}

function validDate(s?: string): string | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  if (isNaN(d.getTime())) return undefined;
  const y = d.getUTCFullYear();
  if (y < 1990 || d.getTime() > Date.now() + 86400000 * 2) return undefined; // reject implausible dates
  return d.toISOString();
}

/**
 * Priority order: JSON-LD (structured, author-controlled) → Open Graph / article:* →
 * standard meta → visible DOM. Each field records where it came from.
 */
export function extractMetadata(doc: Document, pageUrl: string): { metadata: Metadata; jsonLd: JsonLdNode[] } {
  const jsonLd = extractJsonLd(doc);
  const primary = findPrimary(jsonLd);
  const sources: Record<string, string> = {};
  const openGraph: Record<string, string> = {};
  const twitter: Record<string, string> = {};

  doc.querySelectorAll("meta[property^='og:'], meta[name^='og:']").forEach((m) => {
    const k = (m.getAttribute("property") || m.getAttribute("name") || "").slice(3);
    const v = m.getAttribute("content");
    if (k && v && !(k in openGraph)) openGraph[k] = v.trim();
  });
  doc.querySelectorAll("meta[name^='twitter:'], meta[property^='twitter:']").forEach((m) => {
    const k = (m.getAttribute("name") || m.getAttribute("property") || "").slice(8);
    const v = m.getAttribute("content");
    if (k && v && !(k in twitter)) twitter[k] = v.trim();
  });

  const pick = (field: string, candidates: [string, string | undefined][]): string | undefined => {
    for (const [src, val] of candidates) {
      if (val && val.trim()) {
        sources[field] = src;
        return val.trim();
      }
    }
    return undefined;
  };

  const h1 = doc.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim();
  const docTitle = doc.querySelector("title")?.textContent?.replace(/\s+/g, " ").trim();

  const title = pick("title", [
    ["json-ld", str(primary?.headline) || str(primary?.name)],
    ["open-graph", openGraph.title],
    ["twitter", twitter.title],
    ["h1", h1],
    ["title-tag", docTitle],
  ]);

  const description = pick("description", [
    ["json-ld", str(primary?.description)],
    ["open-graph", openGraph.description],
    ["meta", metaContent(doc, "name", "description")],
    ["twitter", twitter.description],
  ]);

  const visibleAuthor =
    doc.querySelector('[rel="author"], [itemprop="author"] [itemprop="name"], [itemprop="author"], .author-name, .byline__name')
      ?.textContent?.replace(/\s+/g, " ").trim();
  const author = pick("author", [
    ["json-ld", str(primary?.author)],
    ["meta", metaContent(doc, "name", "author")],
    ["article-meta", metaContent(doc, "property", "article:author")?.startsWith("http") ? undefined : metaContent(doc, "property", "article:author")],
    ["dom", visibleAuthor && visibleAuthor.length < 80 ? visibleAuthor.replace(/^by\s+/i, "") : undefined],
  ]);

  const siteName = pick("siteName", [
    ["json-ld", str((primary?.publisher as JsonLdNode | undefined)?.name)],
    ["open-graph", openGraph.site_name],
    ["meta", metaContent(doc, "name", "application-name")],
  ]);

  const timeEl = doc.querySelector("time[datetime]")?.getAttribute("datetime") || undefined;
  const publishedDate = pick("publishedDate", [
    ["json-ld", validDate(str(primary?.datePublished))],
    ["article-meta", validDate(metaContent(doc, "property", "article:published_time"))],
    ["meta", validDate(metaContent(doc, "name", "date") || metaContent(doc, "itemprop", "datePublished"))],
    ["dom", validDate(timeEl)],
  ]);
  const modifiedDate = pick("modifiedDate", [
    ["json-ld", validDate(str(primary?.dateModified))],
    ["article-meta", validDate(metaContent(doc, "property", "article:modified_time"))],
    ["open-graph", validDate(openGraph.updated_time)],
  ]);

  const canonicalRaw = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || openGraph.url;
  const canonicalUrl = canonicalRaw ? absolutize(canonicalRaw, pageUrl) : undefined;
  if (canonicalUrl) sources.canonicalUrl = "link-canonical";

  const language = doc.documentElement?.getAttribute("lang")?.trim() || openGraph.locale || metaContent(doc, "property", "og:locale");
  const kwRaw = metaContent(doc, "name", "keywords") || str(primary?.keywords);
  const keywords = kwRaw ? kwRaw.split(",").map((k) => k.trim()).filter(Boolean).slice(0, 25) : undefined;

  const iconHref =
    doc.querySelector('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')?.getAttribute("href") ||
    "/favicon.ico";
  const favicon = absolutize(iconHref, pageUrl);
  const imageRaw = openGraph.image || twitter.image || str(primary?.image);
  const image = imageRaw ? absolutize(imageRaw, pageUrl) : undefined;

  return {
    jsonLd,
    metadata: {
      title, description, author, siteName, publishedDate, modifiedDate, canonicalUrl,
      language: language || undefined, keywords, favicon, image,
      openGraph, twitter,
      jsonLdTypes: [...new Set(jsonLd.flatMap(typesOf))],
      sources,
    },
  };
}
