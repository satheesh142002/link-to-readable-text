import { classTokens, isNegative, linkDensity, textLen } from "../cleaners/boilerplateCleaner.ts";

const POSITIVE = /(^|[-_\s])(article|content|entry|post|story|body|text|main|markdown|prose|docs?|documentation|blog|page-content|readme|rich-text)([-_\s]|$)/i;

export interface ScoredCandidate {
  el: Element;
  score: number;
  textLength: number;
  contentText: number;
  linkDensity: number;
  paragraphs: number;
}

/** Text living in content-bearing elements (p, li, pre, headings, blockquote, td). */
export function contentTextLength(el: Element): number {
  let n = 0;
  el.querySelectorAll("p, pre, blockquote, h1, h2, h3, h4, h5, h6, dd, figcaption").forEach((c) => (n += textLen(c)));
  el.querySelectorAll("li").forEach((li) => {
    if (!li.closest("p, blockquote")) n += textLen(li) * 0.6;
  });
  return n;
}

export function scoreElement(el: Element): ScoredCandidate {
  const text = el.textContent?.replace(/\s+/g, " ").trim() || "";
  const textLength = text.length;
  const ld = linkDensity(el);
  let paragraphs = 0;
  el.querySelectorAll("p").forEach((p) => {
    if (textLen(p) > 40) paragraphs++;
  });
  const headings = el.querySelectorAll("h1, h2, h3, h4").length;
  const codeBlocks = el.querySelectorAll("pre").length;
  const commas = (text.match(/[,.;:!?]/g) || []).length;
  const contentText = contentTextLength(el);

  let score =
    paragraphs * 20 +
    Math.min(textLength / 100, 80) +
    Math.min(commas, 150) * 0.6 +
    headings * 4 +
    codeBlocks * 12 +
    (contentText / Math.max(textLength, 1)) * 40;

  const tag = el.tagName;
  if (tag === "ARTICLE") score += 30;
  if (tag === "MAIN" || el.getAttribute("role") === "main") score += 20;
  if (el.getAttribute("itemprop") === "articleBody") score += 50;
  if (POSITIVE.test(classTokens(el))) score += 15;
  if (isNegative(el)) score -= 40;

  score *= Math.pow(1 - ld, 2);
  return { el, score, textLength, contentText, linkDensity: ld, paragraphs };
}

export function describe(el: Element): string {
  const id = el.getAttribute("id");
  const cls = (el.getAttribute("class") || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).join(".");
  return `${el.tagName.toLowerCase()}${id ? `#${id}` : ""}${cls ? `.${cls}` : ""}`;
}
