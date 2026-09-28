import { parseHTML } from "npm:linkedom@0.18.13";

export function parseDocument(html: string): Document {
  const { document } = parseHTML(html);
  return document as unknown as Document;
}
