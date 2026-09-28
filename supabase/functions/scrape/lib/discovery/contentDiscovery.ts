import { scoreElement, type ScoredCandidate } from "./contentScorer.ts";

const SEMANTIC_SELECTORS = [
  "[itemprop='articleBody']", "article", "main", "[role='main']",
  ".post-content", ".entry-content", ".article-content", ".article-body", ".post-body",
  ".markdown-body", ".theme-doc-markdown", ".rst-content", ".md-content", ".prose", "#content", ".content",
];

export interface DiscoveryResult {
  selected: ScoredCandidate;
  candidates: ScoredCandidate[];
  stage: "preferred" | "semantic" | "scored";
}

/**
 * Multi-stage discovery:
 *  1. adapter-preferred selectors (high confidence)
 *  2. semantic containers
 *  3. scoring of every block container
 *  4. comparison + refinement: descend into a child that holds most of the content text.
 */
export function discoverContent(body: Element, preferred: string[] = []): DiscoveryResult | null {
  const seen = new Set<Element>();
  const candidates: ScoredCandidate[] = [];
  const add = (el: Element) => {
    if (seen.has(el)) return;
    seen.add(el);
    const s = scoreElement(el);
    if (s.textLength >= 120) candidates.push(s);
  };

  for (const sel of preferred) {
    const matches = [...body.querySelectorAll(sel)];
    if (!matches.length) continue;
    const best = matches.map(scoreElement).sort((a, b) => b.contentText - a.contentText)[0];
    if (best && best.contentText > 400 && best.linkDensity < 0.5) {
      return { selected: best, candidates: [best], stage: "preferred" };
    }
  }

  SEMANTIC_SELECTORS.forEach((sel) => body.querySelectorAll(sel).forEach(add));
  body.querySelectorAll("div, section, td").forEach(add);
  add(body);
  if (!candidates.length) return null;

  candidates.sort((a, b) => b.score - a.score);
  let best = candidates[0];

  // Refinement: ancestors accumulate text, so walk down while one child keeps ≥80% of the content text.
  for (let guard = 0; guard < 25; guard++) {
    const children = [...best.el.children].map(scoreElement);
    const dominant = children.find((c) => c.contentText >= best.contentText * 0.8 && c.contentText > 200);
    if (!dominant) break;
    best = dominant;
  }

  // If a sibling-level semantic candidate (e.g. <article>) scores close to the best, prefer it.
  const semantic = candidates.find((c) => ["ARTICLE"].includes(c.el.tagName) && c.contentText >= best.contentText * 0.85);
  if (semantic && best.el.contains(semantic.el)) best = semantic;

  const stage = best.el.matches(SEMANTIC_SELECTORS.join(",")) ? "semantic" : "scored";
  return { selected: best, candidates: candidates.slice(0, 8), stage };
}
