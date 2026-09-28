// DOM-level boilerplate removal. Decisions are based on element semantics, class/id
// tokens, link density and position — never on the wording of the text itself.

export type RemovalCounts = Record<string, number>;

export interface CleanOptions {
  keepComments?: boolean;
}

const bump = (c: RemovalCounts, k: string, n = 1) => (c[k] = (c[k] || 0) + n);

export const textLen = (el: Element | null | undefined) => (el?.textContent || "").replace(/\s+/g, " ").trim().length;

export function linkDensity(el: Element): number {
  const total = textLen(el);
  if (!total) return 0;
  let links = 0;
  el.querySelectorAll("a").forEach((a) => (links += textLen(a)));
  return Math.min(1, links / total);
}

/** Remove non-content nodes: scripts, styles, hidden elements, embeds. */
export function preClean(root: Element, counts: RemovalCounts) {
  const sel = "script, style, noscript, template, link, meta, object, embed, canvas, iframe, svg, button, input, select, textarea";
  root.querySelectorAll(sel).forEach((el) => {
    // Keep <svg> that carry a title (charts with accessible names) out of scope — they have no text to extract anyway.
    bump(counts, el.tagName.toLowerCase());
    el.remove();
  });
  root.querySelectorAll("[hidden], [aria-hidden='true'], [style]").forEach((el) => {
    const style = (el.getAttribute("style") || "").replace(/\s+/g, "").toLowerCase();
    const hidden =
      el.hasAttribute("hidden") ||
      el.getAttribute("aria-hidden") === "true" ||
      style.includes("display:none") ||
      style.includes("visibility:hidden");
    // Collapsed "read more" regions often use hidden/aria-hidden; keep them if they hold real prose.
    if (hidden && !(el.querySelectorAll("p").length >= 2 && textLen(el) > 400)) {
      bump(counts, "hidden");
      el.remove();
    }
  });
}

const NEGATIVE_TOKENS =
  /(^|[-_\s])(nav|navbar|navigation|menu|breadcrumbs?|footer|sidebar|side-bar|cookies?|consent|gdpr|newsletter|subscribe|subscription|signup|sign-up|login|log-in|social|share|sharing|sharebar|related|recommend|recommended|recommendations|promo|promoted|advert|advertisement|ads?|adslot|sponsor|sponsored|popup|pop-up|modal|overlay|disqus|outbrain|taboola|toolbar|skip-link|masthead|paywall|tags?-list|author-box|author-bio|more-stories|trending)([-_\s]|$)/i;
const COMMENT_TOKENS = /(^|[-_\s])(comments?|comment-list|replies|respond)([-_\s]|$)/i;

export function classTokens(el: Element): string {
  return `${el.getAttribute("class") || ""} ${el.getAttribute("id") || ""} ${el.getAttribute("data-testid") || ""}`;
}

export function isNegative(el: Element, opts: CleanOptions = {}): boolean {
  const t = classTokens(el);
  if (NEGATIVE_TOKENS.test(t)) return true;
  if (!opts.keepComments && COMMENT_TOKENS.test(t)) return true;
  return false;
}

/**
 * Remove structural boilerplate. A guard prevents removal of wrappers that contain
 * most of the page's text (e.g. `<div class="content-with-sidebar">`).
 */
export function removeBoilerplate(root: Element, counts: RemovalCounts, opts: CleanOptions = {}) {
  const totalText = Math.max(1, textLen(root));
  const isWrapper = (el: Element) => textLen(el) / totalText > 0.5 && linkDensity(el) < 0.4;

  const semantic =
    "nav, aside, footer, dialog, [role='navigation'], [role='banner'], [role='contentinfo'], [role='complementary'], [role='search'], [role='dialog'], [role='alertdialog'], [aria-modal='true']";
  root.querySelectorAll(semantic).forEach((el) => {
    if (!el.isConnected || isWrapper(el)) return;
    // A <footer> inside an <article> often carries footnotes/references — keep it if it isn't link-heavy.
    if (el.tagName === "FOOTER" && el.closest("article") && linkDensity(el) < 0.5 && textLen(el) > 80) return;
    bump(counts, "semantic");
    el.remove();
  });

  root.querySelectorAll("header").forEach((el) => {
    if (!el.isConnected) return;
    // Keep article headers (they hold the title/byline); drop site headers.
    if (el.closest("article") && !el.querySelector("nav")) return;
    if (el.querySelector("h1") && textLen(el) < 400 && !el.querySelector("nav")) return;
    bump(counts, "header");
    el.remove();
  });

  root.querySelectorAll("form").forEach((el) => {
    if (!el.isConnected || isWrapper(el)) return; // ASP.NET-style pages wrap everything in <form>
    bump(counts, "form");
    el.remove();
  });

  root.querySelectorAll("[class], [id]").forEach((el) => {
    if (!el.isConnected || el.tagName === "BODY" || el.tagName === "HTML" || el.tagName === "MAIN" || el.tagName === "ARTICLE") return;
    if (!isNegative(el, opts)) return;
    if (isWrapper(el)) return;
    if (el.querySelectorAll("p").length >= 4 && linkDensity(el) < 0.25) return; // prose inside a mislabeled container
    bump(counts, "pattern");
    el.remove();
  });
}

/** Inside the selected content, drop small link-dense blocks (inline "related links", tag clouds). */
export function removeLinkDenseBlocks(root: Element, counts: RemovalCounts) {
  root.querySelectorAll("div, section, ul, ol, table").forEach((el) => {
    if (!el.isConnected) return;
    const len = textLen(el);
    if (len === 0) {
      if (!el.querySelector("img, pre, table, video, picture")) {
        bump(counts, "empty");
        el.remove();
      }
      return;
    }
    if (len < 400 && linkDensity(el) > 0.65 && el.querySelectorAll("a").length >= 3 && !el.querySelector("pre, code")) {
      // Keep lists that look like a real table of contents *inside* documentation? They add little to reading — drop.
      bump(counts, "link-dense");
      el.remove();
    }
  });
}
