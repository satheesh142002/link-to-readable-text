// Shared types for the extraction pipeline. Mirrored in src/types/scrape.ts for the frontend.

export const EXTRACTOR_VERSION = "2.0.0";

export type Inline =
  | { type: "text"; text: string }
  | { type: "strong"; text: string }
  | { type: "em"; text: string }
  | { type: "code"; text: string }
  | { type: "link"; text: string; href: string };

export interface ListItem {
  content: Inline[];
  children?: ListBlock[];
}

export interface ListBlock {
  type: "list";
  ordered: boolean;
  items: ListItem[];
}

export type DocumentBlock =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; content: Inline[] }
  | { type: "paragraph"; content: Inline[] }
  | ListBlock
  | { type: "blockquote"; blocks: DocumentBlock[] }
  | { type: "code"; code: string; language?: string }
  | { type: "table"; headers: string[]; rows: string[][]; caption?: string }
  | { type: "image"; src: string; alt?: string; title?: string; caption?: string }
  | { type: "definitionList"; items: { term: string; description: string }[] }
  | { type: "hr" };

export interface ImageMetadata {
  src: string;
  alt?: string;
  title?: string;
  caption?: string;
}

export interface LinkMetadata {
  href: string;
  text: string;
}

export interface Metadata {
  title?: string;
  description?: string;
  author?: string;
  siteName?: string;
  publishedDate?: string;
  modifiedDate?: string;
  canonicalUrl?: string;
  language?: string;
  keywords?: string[];
  favicon?: string;
  image?: string;
  openGraph: Record<string, string>;
  twitter: Record<string, string>;
  jsonLdTypes: string[];
  sources: Record<string, string>; // which source provided each field
}

export type ContentType =
  | "article" | "blog" | "news" | "documentation" | "github" | "forum"
  | "product" | "faq" | "reference" | "search" | "generic";

export interface ExtractionQuality {
  score: number;
  confidence: "high" | "medium" | "low";
  signals: string[];
}

export interface CandidateInfo {
  selector: string;
  score: number;
  textLength: number;
  linkDensity: number;
  paragraphs: number;
}

export interface ExtractionDiagnostics {
  requestId: string;
  extractorVersion: string;
  finalUrl: string;
  httpStatus?: number;
  pageLoadMs?: number;
  extractionMs?: number;
  durationMs: number;
  strategy: string;
  extractor: string;
  selectedContainer?: string;
  candidates: CandidateInfo[];
  removedElements: Record<string, number>;
  duplicatesRemoved: number;
  retries: number;
  cached: boolean;
  htmlBytes?: number;
}

export interface ScrapeResult {
  url: string;
  finalUrl: string;
  title: string;
  metadata: Metadata;
  document: { type: "document"; title: string; blocks: DocumentBlock[] };
  markdown: string;
  text: string;
  html: string;
  images: ImageMetadata[];
  links: LinkMetadata[];
  wordCount: number;
  characterCount: number;
  readingTimeMinutes: number;
  contentType: ContentType;
  quality: ExtractionQuality;
  extractedAt: string;
}

export type ScrapeErrorCode =
  | "INVALID_URL" | "UNSUPPORTED_PROTOCOL" | "BLOCKED_DESTINATION" | "NAVIGATION_TIMEOUT"
  | "PAGE_NOT_FOUND" | "ACCESS_DENIED" | "CONTENT_NOT_FOUND" | "EMPTY_CONTENT"
  | "SCRAPE_TIMEOUT" | "TOO_LARGE" | "UNSUPPORTED_PAGE" | "UPSTREAM_ERROR" | "INTERNAL_ERROR";

export class ScrapeError extends Error {
  constructor(public code: ScrapeErrorCode, message: string, public status = 400) {
    super(message);
  }
}
