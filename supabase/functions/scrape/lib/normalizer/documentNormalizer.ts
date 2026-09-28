import type { DocumentBlock, Inline, ListBlock, ListItem } from "../types.ts";
import { absolutize } from "../utils/urls.ts";

const BLOCK_TAGS = new Set([
  "P", "DIV", "SECTION", "ARTICLE", "MAIN", "HEADER", "FOOTER", "ASIDE", "NAV", "UL", "OL", "LI", "PRE", "BLOCKQUOTE",
  "TABLE", "THEAD", "TBODY", "TR", "TD", "TH", "FIGURE", "FIGCAPTION", "H1", "H2", "H3", "H4", "H5", "H6", "HR", "DL",
  "DT", "DD", "DETAILS", "SUMMARY", "CENTER", "ADDRESS", "PICTURE", "IMG", "VIDEO",
]);
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "SVG"]);

const collapse = (s: string) => s.replace(/[\s\u00a0]+/g, " ");

export class Normalizer {
  constructor(private baseUrl: string) {}

  // ---------- inline ----------
  inlines(node: Node): Inline[] {
    const out: Inline[] = [];
    const walk = (n: Node) => {
      if (n.nodeType === 3) {
        out.push({ type: "text", text: collapse(n.textContent || "") });
        return;
      }
      if (n.nodeType !== 1) return;
      const el = n as Element;
      const tag = el.tagName;
      if (SKIP_TAGS.has(tag)) return;
      if (tag === "BR") return void out.push({ type: "text", text: "\n" });
      if (tag === "IMG") return;
      const text = collapse(el.textContent || "").trim();
      if (tag === "A") {
        const href = absolutize(el.getAttribute("href") || "", this.baseUrl);
        if (text && href && !href.includes("#") || (text && href && !href.startsWith(this.baseUrl.split("#")[0] + "#"))) {
          if (text) out.push(href ? { type: "link", text, href } : { type: "text", text });
        } else if (text) out.push({ type: "text", text });
        return;
      }
      if (tag === "STRONG" || tag === "B") return void (text && out.push({ type: "strong", text }));
      if (tag === "EM" || tag === "I" || tag === "CITE") return void (text && out.push({ type: "em", text }));
      if (tag === "CODE" || tag === "KBD" || tag === "SAMP") {
        return void (text && out.push({ type: "code", text: (el.textContent || "").trim() }));
      }
      el.childNodes.forEach(walk);
    };
    walk(node);
    return mergeInlines(out);
  }

  // ---------- blocks ----------
  blocks(root: Element): DocumentBlock[] {
    const out: DocumentBlock[] = [];
    let buffer: Node[] = [];
    const flush = () => {
      if (!buffer.length) return;
      const content = mergeInlines(buffer.flatMap((n) => this.inlines(n)));
      if (inlineText(content).trim()) out.push({ type: "paragraph", content });
      buffer = [];
    };

    root.childNodes.forEach((n) => {
      if (n.nodeType === 3) {
        if ((n.textContent || "").trim()) buffer.push(n);
        return;
      }
      if (n.nodeType !== 1) return;
      const el = n as Element;
      if (SKIP_TAGS.has(el.tagName)) return;
      if (!BLOCK_TAGS.has(el.tagName) && !hasBlockDescendant(el)) {
        buffer.push(el);
        return;
      }
      flush();
      out.push(...this.block(el));
    });
    flush();
    return out;
  }

  private block(el: Element): DocumentBlock[] {
    const tag = el.tagName;
    switch (tag) {
      case "H1": case "H2": case "H3": case "H4": case "H5": case "H6": {
        const content = this.inlines(el);
        return inlineText(content).trim() ? [{ type: "heading", level: Number(tag[1]) as 1, content }] : [];
      }
      case "P": {
        if (hasBlockDescendant(el)) return this.blocks(el);
        const content = this.inlines(el);
        const imgs = this.images(el);
        const blocks: DocumentBlock[] = [];
        if (inlineText(content).trim()) blocks.push({ type: "paragraph", content });
        return [...blocks, ...imgs];
      }
      case "UL": case "OL": {
        const list = this.list(el);
        return list.items.length ? [list] : [];
      }
      case "PRE":
        return [this.code(el)];
      case "BLOCKQUOTE": {
        const inner = this.blocks(el);
        return inner.length ? [{ type: "blockquote", blocks: inner }] : [];
      }
      case "TABLE":
        return this.table(el);
      case "HR":
        return [{ type: "hr" }];
      case "IMG": case "PICTURE":
        return this.images(el);
      case "FIGURE": {
        if (el.querySelector("pre, table, blockquote")) return this.blocks(el);
        const caption = collapse(el.querySelector("figcaption")?.textContent || "").trim() || undefined;
        const imgs = this.images(el).map((b) => (b.type === "image" ? { ...b, caption: caption || b.caption } : b));
        if (imgs.length) return imgs;
        return caption ? [{ type: "paragraph", content: [{ type: "em", text: caption }] }] : [];
      }
      case "DL": {
        const items: { term: string; description: string }[] = [];
        let term = "";
        [...el.children].forEach((c) => {
          if (c.tagName === "DT") term = collapse(c.textContent || "").trim();
          else if (c.tagName === "DD") items.push({ term, description: collapse(c.textContent || "").trim() });
        });
        return items.length ? [{ type: "definitionList", items }] : [];
      }
      case "DETAILS": {
        const summary = collapse(el.querySelector("summary")?.textContent || "").trim();
        const rest = this.blocks(el).filter((b) => !(b.type === "paragraph" && inlineText(b.content).trim() === summary));
        return [...(summary ? [{ type: "heading", level: 4, content: [{ type: "text", text: summary }] } as DocumentBlock] : []), ...rest];
      }
      case "SUMMARY":
        return [];
      default:
        return this.blocks(el);
    }
  }

  private list(el: Element): ListBlock {
    const items: ListItem[] = [];
    [...el.children].forEach((li) => {
      if (li.tagName !== "LI") return;
      const children: ListBlock[] = [];
      const inlineNodes: Node[] = [];
      li.childNodes.forEach((c) => {
        if (c.nodeType === 1 && ["UL", "OL"].includes((c as Element).tagName)) children.push(this.list(c as Element));
        else inlineNodes.push(c);
      });
      const content = mergeInlines(inlineNodes.flatMap((n) => (n.nodeType === 1 && (n as Element).tagName === "PRE" ? [{ type: "code", text: n.textContent || "" } as Inline] : this.inlines(n))));
      if (inlineText(content).trim() || children.length) items.push({ content, ...(children.length ? { children } : {}) });
    });
    return { type: "list", ordered: el.tagName === "OL", items };
  }

  private code(el: Element): DocumentBlock {
    const codeEl = el.querySelector("code") || el;
    // Line-numbered highlighters render one element per line; textContent keeps indentation.
    let code = (codeEl.textContent || "").replace(/\r\n/g, "\n").replace(/\u00a0/g, " ");
    code = code.replace(/^\n+|\s+$/g, "");
    const langSrc = `${codeEl.getAttribute("class") || ""} ${el.getAttribute("class") || ""} ${el.getAttribute("data-language") || ""} ${el.parentElement?.getAttribute("class") || ""}`;
    const m = langSrc.match(/(?:language|lang|highlight-source|highlight)-([a-z0-9+#-]+)/i) || (el.getAttribute("data-language") ? [null, el.getAttribute("data-language")] : null);
    const language = m?.[1]?.toLowerCase().replace(/^(none|plain|text|plaintext)$/, "") || undefined;
    return language ? { type: "code", code, language } : { type: "code", code };
  }

  /** Content tables vs layout tables: headers, regular grid, short cells, no nesting. */
  private table(el: Element): DocumentBlock[] {
    if (el.querySelector("table")) return this.blocks(el);
    const rows = [...el.querySelectorAll("tr")];
    const cellsOf = (tr: Element) => [...tr.children].filter((c) => c.tagName === "TD" || c.tagName === "TH");
    const cols = Math.max(0, ...rows.map((r) => cellsOf(r).length));
    const hasTh = !!el.querySelector("th");
    const allCells = rows.flatMap(cellsOf);
    const avgLen = allCells.reduce((n, c) => n + collapse(c.textContent || "").length, 0) / Math.max(allCells.length, 1);
    const role = el.getAttribute("role");
    const isLayout = role === "presentation" || cols < 2 || rows.length < 2 || (!hasTh && avgLen > 250) || !!el.querySelector("td > div > div, td > p ~ p ~ p");
    if (isLayout) return this.blocks(el);

    const text = (c: Element) => collapse(c.textContent || "").trim();
    let headerRow = el.querySelector("thead tr") || (cellsOf(rows[0]).every((c) => c.tagName === "TH") ? rows[0] : null);
    const headers = headerRow ? cellsOf(headerRow).map(text) : cellsOf(rows[0]).map((_, i) => `Column ${i + 1}`);
    const body = rows.filter((r) => r !== headerRow).map((r) => {
      const cells = cellsOf(r).map(text);
      while (cells.length < headers.length) cells.push("");
      return cells.slice(0, Math.max(headers.length, cells.length));
    }).filter((r) => r.some(Boolean));
    headerRow = null;
    const caption = collapse(el.querySelector("caption")?.textContent || "").trim() || undefined;
    return [{ type: "table", headers, rows: body, ...(caption ? { caption } : {}) }];
  }

  images(el: Element): DocumentBlock[] {
    const imgs = el.tagName === "IMG" ? [el] : [...el.querySelectorAll("img")];
    const out: DocumentBlock[] = [];
    for (const img of imgs) {
      const srcset = img.getAttribute("srcset") || img.getAttribute("data-srcset") || "";
      const fromSet = srcset.split(",").map((s) => s.trim().split(/\s+/)[0]).filter(Boolean).pop();
      const raw = img.getAttribute("data-src") || img.getAttribute("data-original") || img.getAttribute("src") || fromSet || "";
      const src = absolutize(raw, this.baseUrl);
      if (!src || !isMeaningfulImage(img, src)) continue;
      const alt = img.getAttribute("alt")?.trim() || undefined;
      const title = img.getAttribute("title")?.trim() || undefined;
      out.push({ type: "image", src, ...(alt ? { alt } : {}), ...(title ? { title } : {}) });
    }
    return out;
  }
}

export function isMeaningfulImage(img: Element, src: string): boolean {
  const w = Number(img.getAttribute("width"));
  const h = Number(img.getAttribute("height"));
  if ((w && w < 48) || (h && h < 48)) return false;
  if (/(pixel|tracking|spacer|blank|1x1|beacon|analytics|doubleclick|facebook\.com\/tr)/i.test(src)) return false;
  if (/\.(svg)(\?|$)/i.test(src) && !img.getAttribute("alt")) return false;
  if (/(avatar|icon|logo|emoji|badge|sprite)/i.test(`${img.getAttribute("class") || ""} ${src}`) && !(w > 200)) return false;
  return true;
}

function hasBlockDescendant(el: Element): boolean {
  return !!el.querySelector("p, div, ul, ol, pre, table, blockquote, h1, h2, h3, h4, h5, h6, figure, section, article, dl, hr");
}

export function mergeInlines(list: Inline[]): Inline[] {
  const out: Inline[] = [];
  for (const i of list) {
    if (!i.text) continue;
    const last = out[out.length - 1];
    if (i.type === "text" && last?.type === "text") last.text += i.text;
    else out.push({ ...i });
  }
  // Trim leading/trailing whitespace of the run and around explicit breaks.
  if (out[0]?.type === "text") out[0].text = out[0].text.replace(/^[ \t]+/, "");
  const end = out[out.length - 1];
  if (end?.type === "text") end.text = end.text.replace(/\s+$/, "");
  for (const i of out) if (i.type === "text") i.text = i.text.replace(/ *\n */g, "\n").replace(/ {2,}/g, " ");
  return out.filter((i) => i.text !== "");
}

export function inlineText(list: Inline[]): string {
  return list.map((i) => i.text).join("");
}
